import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service.js';
import { WorkflowService } from '../services/workflow.service.js';
import { LogService } from '../services/log.service.js';
import { db } from '../db/index.js';
import { userProfile, documentTemplate } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { domYToPdfY } from '../services/coordinateUtils.js';

const router = express.Router();

// Setup Multer for PDF file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Upload to a temporary pending folder
        const pendingPath = path.join(process.env.DOCUMENT_STORAGE_PATH || './storage/documents', 'pending');
        if (!fs.existsSync(pendingPath)) {
            fs.mkdirSync(pendingPath, { recursive: true });
        }
        cb(null, pendingPath);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const originalName = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitize special chars
            .substring(0, 60);  // limit length
        cb(null, `${originalName}_${timestamp}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// Prefix: /api/documents

// GET /api/documents (List all documents, requires auth)
router.get('/', requireAuth, async (req, res) => {
    try {
        const filters = {};
        if (req.query.startDate) filters.startDate = req.query.startDate;
        if (req.query.endDate) filters.endDate = req.query.endDate;
        
        const docs = await DocumentService.listDocuments(filters);
        res.json(docs);
    } catch (err) {
        console.error("List Documents Error:", err);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

// GET /api/documents/workflow-preview (Fetch exact workflow steps)
router.get('/workflow-preview', requireAuth, async (req, res) => {
    try {
        const { category, branch, subCategory } = req.query;
        if (!category || !branch) {
            return res.status(400).json({ error: "Missing required query parameters: category, branch" });
        }
        
        const wf = await WorkflowService.resolveWorkflowTemplate(category, branch, subCategory);
        res.json(wf || { steps: [] });
    } catch (err) {
        console.error("Workflow Preview Error:", err);
        res.status(500).json({ error: "Failed to resolve workflow preview" });
    }
});

// GET /api/documents/:id (Get single document)
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const doc = await DocumentService.getDocumentById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        // Add authorization to approve flag based on pending list logic
        const { ApprovalService } = await import('../services/approval.service.js');
        const pendingApprovals = await ApprovalService.getPendingApprovals(req.user.id, req.user.role || '');
        doc.canIApprove = pendingApprovals.some(p => p.documentId === doc.id);

        res.json(doc);
    } catch (err) {
        console.error("Get Document Error:", err);
        res.status(500).json({ error: "Failed to fetch document" });
    }
});

// GET /api/documents/:id/file (Stream document PDF from NAS/Server)
router.get('/:id/file', requireAuth, async (req, res) => {
    try {
        const doc = await DocumentService.getDocumentById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }

        const filePath = doc.signedFilePath || doc.filePath;
        if (!filePath) {
            return res.status(404).json({ error: "No physical file found for this document" });
        }

        let absolutePath = filePath;
        // If the path isn't absolute, it's an old relative storage path from DB
        if (!path.isAbsolute(filePath)) {
            // Check original CWD first
            absolutePath = path.resolve(process.cwd(), filePath);
            if (!fs.existsSync(absolutePath) && process.env.DOCUMENT_STORAGE_PATH) {
                // If they migrated to NAS but DB path is still relative: map filename to NAS folder
                absolutePath = path.join(process.env.DOCUMENT_STORAGE_PATH, path.basename(filePath));
            }
        }

        if (!fs.existsSync(absolutePath)) {
            console.error(`[File Stream] Target file missing: ${absolutePath}`);
            return res.status(404).json({ error: "File not found on the NAS/Server Storage" });
        }

        res.contentType('application/pdf');
        
        if (req.query.download === 'true') {
            const safeTitle = (doc.title || doc.displayId).replace(/[^a-zA-Z0-9_ -]/g, '');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
        } else {
            res.setHeader('Content-Disposition', 'inline');
            // Prevent caching to ensure stamped PDFs are loaded
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        }

        const fileStream = fs.createReadStream(absolutePath);
        fileStream.pipe(res);
    } catch (err) {
        console.error("Serve File Error:", err);
        res.status(500).json({ error: "Failed to serve the requested document file." });
    }
});

// POST /api/documents (Upload new document)
router.post('/', requireAuth, upload.single('documentFile'), async (req, res) => {
    try {
        const { title, category, branch, department, notes, subCategory } = req.body;
        
        // Parse dynamicDepartments if provided (multipart/form-data could send it as a JSON string)
        let dynamicDepartments = [];
        try {
            if (req.body.dynamicDepartments) {
                dynamicDepartments = JSON.parse(req.body.dynamicDepartments);
            }
        } catch (err) {
            console.warn("Failed to parse dynamicDepartments", err);
        }

        if (!req.file) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }
        
        if (!category || typeof category !== 'string' || !branch) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Invalid input data: Category and Branch are REQUIRED" });
        }

        // Branch access validation: ensure user is allowed to upload to this branch
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, req.user.id)).limit(1);
            const allowedBranches = profile?.branches || [];
            if (!allowedBranches.includes(branch)) {
                if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(403).json({ error: `Forbidden: You are not authorized to upload documents for branch "${branch}".` });
            }
        }

        const data = {
            title,
            category,
            subCategory: subCategory || null,
            branch,
            department: department || null,
            notes: notes || null,
            filePath: req.file.path,
            originalName: req.file.originalname,
            uploadedBy: req.user.id,
            dynamicDepartments
        };

        const newDoc = await DocumentService.createDocument(data);

        res.status(201).json(newDoc);
    } catch (err) {
        console.error("Create Document Error:", err);
        // Explicitly remove the uploaded file to prevent pending garbage file accumulation
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkErr) {
                console.error("Failed to delete pending file:", unlinkErr);
            }
        }
        res.status(500).json({ error: err.message || "Failed to create document" });
    }
});

// =====================================================================
// HTML Rich Text → pdf-lib Text Runs Parser
// Parses HTML from ReactQuill and returns styled text segments.
// =====================================================================
function parseHtmlToRuns(html) {
    if (!html || typeof html !== 'string') return [{ text: String(html || ''), bold: false, italic: false, underline: false }];
    
    // Check if content has any HTML tags at all
    if (!/<[^>]+>/.test(html)) {
        return [{ text: html, bold: false, italic: false, underline: false }];
    }

    const runs = [];
    // Replace common HTML entities
    let cleaned = html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
    // Replace <br>, <br/>, </p><p> with newline markers
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>\s*<p[^>]*>/gi, '\n');
    // Remove opening <p> and closing </p> at boundaries
    cleaned = cleaned.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '');
    // Handle lists: <li> becomes "• " with newline
    cleaned = cleaned.replace(/<li[^>]*>/gi, '\n• ').replace(/<\/li>/gi, '');
    cleaned = cleaned.replace(/<\/?(?:ul|ol)[^>]*>/gi, '');

    // Now parse inline tags: <strong>, <b>, <em>, <i>, <u>, <span>
    // Use a simple state-machine approach
    let pos = 0;
    let bold = false, italic = false, underline = false;
    const tagRegex = /<(\/?)(\w+)([^>]*)>/g;
    let match;
    
    while ((match = tagRegex.exec(cleaned)) !== null) {
        // Text before the tag
        if (match.index > pos) {
            const text = cleaned.substring(pos, match.index);
            if (text) runs.push({ text, bold, italic, underline });
        }
        
        const isClosing = match[1] === '/';
        const tagName = match[2].toLowerCase();
        
        if (tagName === 'strong' || tagName === 'b') bold = !isClosing;
        else if (tagName === 'em' || tagName === 'i') italic = !isClosing;
        else if (tagName === 'u') underline = !isClosing;
        // span with style could carry more, but we'll keep it simple
        
        pos = match.index + match[0].length;
    }
    
    // Remaining text after last tag
    if (pos < cleaned.length) {
        const text = cleaned.substring(pos);
        if (text) runs.push({ text, bold, italic, underline });
    }
    
    if (runs.length === 0) {
        // Fallback: strip all tags and return as plain text
        const stripped = cleaned.replace(/<[^>]*>/g, '');
        runs.push({ text: stripped, bold: false, italic: false, underline: false });
    }
    
    return runs;
}

// =====================================================================
// Rich Text Field Drawer with Multi-Page Overflow
// Draws styled text runs onto PDF pages, auto-creating new pages
// when text exceeds available space.
// =====================================================================
function drawRichTextField(pdfDoc, fonts, startPageIndex, startX, startY, maxWidth, runs, fontSize, bottomMargin) {
    const lineHeight = fontSize * 1.4;
    // startY is the TOP edge of the box. Baseline starts one fontSize lower.
    let cursorY = startY - fontSize;
    let currentPageIndex = startPageIndex;
    let page = pdfDoc.getPage(currentPageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const bm = bottomMargin || 40;

    function getFont(run) {
        if (run.bold && run.italic) return fonts.boldItalic;
        if (run.bold) return fonts.bold;
        if (run.italic) return fonts.italic;
        return fonts.regular;
    }

    function ensureSpace() {
        if (cursorY < bm) {
            // Add a new blank page with same dimensions
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentPageIndex = pdfDoc.getPageCount() - 1;
            cursorY = pageHeight - 50; // top margin on new page
        }
    }

    // Flatten runs into words with their styling for wrapping
    const allWords = [];
    for (const run of runs) {
        const parts = run.text.split(/(\n)/); // split by newlines, keeping them
        for (const part of parts) {
            if (part === '\n') {
                allWords.push({ text: '\n', font: getFont(run), bold: run.bold, italic: run.italic, underline: run.underline });
            } else {
                const words = part.split(/( +)/); // split by spaces, keeping them
                for (const w of words) {
                    if (w.length > 0) {
                        allWords.push({ text: w, font: getFont(run), bold: run.bold, italic: run.italic, underline: run.underline });
                    }
                }
            }
        }
    }

    // Now lay out words with wrapping
    let lineWords = [];
    let lineWidth = 0;

    function flushLine() {
        if (lineWords.length === 0) return;
        ensureSpace();
        let drawX = startX;
        for (const word of lineWords) {
            const w = word.font.widthOfTextAtSize(word.text, fontSize);
            page.drawText(word.text, {
                x: drawX,
                y: cursorY,
                size: fontSize,
                font: word.font,
                color: rgb(0, 0, 0),
            });
            // Draw underline if needed
            if (word.underline) {
                page.drawLine({
                    start: { x: drawX, y: cursorY - 1 },
                    end: { x: drawX + w, y: cursorY - 1 },
                    thickness: 0.5,
                    color: rgb(0, 0, 0),
                });
            }
            drawX += w;
        }
        cursorY -= lineHeight;
        lineWords = [];
        lineWidth = 0;
    }

    for (const word of allWords) {
        if (word.text === '\n') {
            flushLine();
            continue;
        }
        const wordWidth = word.font.widthOfTextAtSize(word.text, fontSize);
        if (lineWidth + wordWidth > maxWidth && lineWords.length > 0) {
            flushLine();
            ensureSpace();
        }
        lineWords.push(word);
        lineWidth += wordWidth;
    }
    flushLine(); // flush remaining

    return { lastPageIndex: currentPageIndex, lastY: cursorY };
}

// =====================================================================
// Multer config for /generate endpoint (image attachments)
// =====================================================================
const generateUpload = multer({
    storage: multer.memoryStorage(), // keep in memory for embedding into PDF
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed as attachments'), false);
    }
});

// POST /api/documents/generate (Generate document from template)
router.post('/generate', requireAuth, generateUpload.array('attachments', 10), async (req, res) => {
    try {
        // Body fields come as strings from FormData — parse them
        const templateId = req.body.templateId;
        const documentTitle = req.body.documentTitle || '';
        const category = req.body.category;
        const branch = req.body.branch;
        const department = req.body.department || null;
        const notes = req.body.notes || null;
        const subCategory = req.body.subCategory || null;
        
        let formData = {};
        try {
            if (req.body.formData) {
                formData = typeof req.body.formData === 'string' ? JSON.parse(req.body.formData) : req.body.formData;
            }
        } catch (e) {
            console.warn("[DocGen] Failed to parse formData:", e.message);
        }

        let dynamicDepartments = [];
        try {
            if (req.body.dynamicDepartments) {
                dynamicDepartments = typeof req.body.dynamicDepartments === 'string' ? JSON.parse(req.body.dynamicDepartments) : req.body.dynamicDepartments;
            }
        } catch (err) {
            console.warn("Failed to parse dynamicDepartments", err);
        }

        if (!templateId || !category || !branch) {
            return res.status(400).json({ error: "Missing required fields: templateId, category, branch" });
        }

        // Branch access validation
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, req.user.id)).limit(1);
            const allowedBranches = profile?.branches || [];
            if (!allowedBranches.includes(branch)) {
                return res.status(403).json({ error: `Forbidden: You are not authorized to upload documents for branch "${branch}".` });
            }
        }

        const [template] = await db.select().from(documentTemplate).where(eq(documentTemplate.id, templateId));
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        if (!fs.existsSync(template.filePath)) {
            return res.status(404).json({ error: "Physical template file is missing on the server" });
        }

        const combinedTitle = `${template.name} - ${documentTitle || 'Untitled'}`;

        // ===== LOAD PDF & EMBED FONTS =====
        const pdfBytes = fs.readFileSync(template.filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Embed all 4 Helvetica variants for rich text support
        const fonts = {
            regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
            bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
            italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
            boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        };
        const fontSize = 11;
        const bottomMargin = 40;
        
        // ===== FILL ACROFORM FIELDS NATIVELY =====
        // Since Visual Mapping coordinates were failing for complex PDF CropBox/Matrices, 
        // we shifted back to native AcroForm mapping (e.g. via Nitro/Adobe).
        const form = pdfDoc.getForm();
        
        if (formData && typeof formData === 'object') {
            for (const [key, value] of Object.entries(formData)) {
                if (!value && value !== 0) continue;
                
                try {
                    // Ignore predefined prefix check, just match the exact name
                    const field = form.getTextField(key);
                    if (field) {
                        field.setText(String(value));
                    }
                } catch (e) {
                    console.warn(`[DocGen] Could not find/fill AcroForm field: ${key}`);
                }
            }
        }
        
        // Flatten the form to burn the text permanently into the PDF layer
        form.flatten();

        // ===== IMAGE ATTACHMENTS — Embed as grid pages =====
        const attachments = req.files || [];
        if (attachments.length > 0) {
            console.log(`[DocGen] Embedding ${attachments.length} image attachment(s)...`);
            
            const firstPage = pdfDoc.getPage(0);
            const { width: pgW, height: pgH } = firstPage.getSize();
            const margin = 40;
            const colGap = 20;
            const rowGap = 20;
            const cols = 2;
            const imgWidth = (pgW - margin * 2 - colGap * (cols - 1)) / cols;
            const maxImgHeight = 250;
            
            let attachPage = pdfDoc.addPage([pgW, pgH]);
            // Draw "Lampiran" header
            attachPage.drawText('Lampiran', {
                x: margin, y: pgH - margin - 20,
                size: 16, font: fonts.bold, color: rgb(0, 0, 0),
            });
            
            let curX = margin;
            let curY = pgH - margin - 50;
            let colIdx = 0;

            for (const att of attachments) {
                try {
                    let embeddedImg;
                    if (att.mimetype === 'image/png') {
                        embeddedImg = await pdfDoc.embedPng(att.buffer);
                    } else {
                        embeddedImg = await pdfDoc.embedJpg(att.buffer);
                    }

                    // Scale image to fit within cell
                    const aspect = embeddedImg.width / embeddedImg.height;
                    let drawW = imgWidth;
                    let drawH = drawW / aspect;
                    if (drawH > maxImgHeight) {
                        drawH = maxImgHeight;
                        drawW = drawH * aspect;
                    }

                    // Check if we need a new page
                    if (curY - drawH < margin) {
                        attachPage = pdfDoc.addPage([pgW, pgH]);
                        curX = margin;
                        curY = pgH - margin - 20;
                        colIdx = 0;
                    }

                    attachPage.drawImage(embeddedImg, {
                        x: curX, y: curY - drawH,
                        width: drawW, height: drawH,
                    });

                    colIdx++;
                    if (colIdx >= cols) {
                        colIdx = 0;
                        curX = margin;
                        curY -= (drawH + rowGap);
                    } else {
                        curX += imgWidth + colGap;
                    }
                } catch (imgErr) {
                    console.warn(`[DocGen] Failed to embed attachment ${att.originalname}:`, imgErr.message);
                }
            }
        }

        // ===== SAVE GENERATED PDF =====
        const flatPdfBytes = await pdfDoc.save();

        const pendingPath = path.join(process.env.DOCUMENT_STORAGE_PATH || './storage/documents', 'pending');
        if (!fs.existsSync(pendingPath)) {
            fs.mkdirSync(pendingPath, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeTitle = combinedTitle.replace(/[^a-zA-Z0-9_ -]/g, '').substring(0, 60);
        const filename = `${safeTitle.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        const generatedPath = path.join(pendingPath, filename);

        fs.writeFileSync(generatedPath, flatPdfBytes);
        console.log(`[DocGen] ✅ Generated PDF saved: ${generatedPath} (${flatPdfBytes.length} bytes)`);

        // ===== CREATE DOCUMENT RECORD (file_path → generated file, NOT template) =====
        const data = {
            title: combinedTitle,
            category,
            subCategory: subCategory || null,
            branch,
            department: department || null,
            notes: notes || null,
            filePath: generatedPath,   // ← CRITICAL: points to GENERATED file, not template
            originalName: filename,
            uploadedBy: req.user.id,
            dynamicDepartments
        };

        const newDoc = await DocumentService.createDocument(data);
        res.status(201).json(newDoc);
    } catch (err) {
        console.error("Generate Document Error:", err);
        res.status(500).json({ error: err.message || "Failed to generate document" });
    }
});

// DELETE /api/documents/:id (Delete document, restricted to Admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const role = req.user.role?.toLowerCase() || '';
        if (role !== 'admin' && role !== 'super_admin' && role !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can delete documents" });
        }

        const doc = await DocumentService.getDocumentById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: "Document not found or already deleted" });
        }

        const success = await DocumentService.deleteDocument(req.params.id);

        if (!success) {
            return res.status(404).json({ error: "Document not found or already deleted" });
        }

        LogService.createLog(
            req.user.id,
            'DOCUMENT_DELETED',
            'Document',
            req.params.id,
            `deleted document "${doc.title}" (${doc.displayId})`
        );

        res.json({ message: "Document deleted successfully" });
    } catch (err) {
        console.error("Delete Document Error:", err);
        res.status(500).json({ error: "Failed to delete document" });
    }
});

export default router;
