import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service.js';
import { WorkflowService } from '../services/workflow.service.js';
import { LogService } from '../services/log.service.js';
import { db } from '../db/index.js';
import { userProfile, documentTemplate, signature } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { renderHtmlToPdf } from '../services/puppeteer.service.js';

const router = express.Router();

// Setup Multer for manual PDF file uploads (POST /api/documents — manual upload)
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

// Multer config for /generate endpoint (image attachments only)
const generateUpload = multer({
    storage: multer.memoryStorage(), // keep in memory for embedding into PDF
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed as attachments'), false);
    }
});

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

// =====================================================================
// POST /api/documents/draft-preview (Generate a preview PDF from template)
// Returns PDF buffer directly for the CreatorSignatureModal
// =====================================================================
router.post('/draft-preview', requireAuth, async (req, res) => {
    try {
        const { templateId, formData } = req.body;

        if (!templateId) {
            return res.status(400).json({ error: "Missing required field: templateId" });
        }

        const [template] = await db.select().from(documentTemplate).where(eq(documentTemplate.id, templateId));
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        if (!template.htmlContent) {
            return res.status(400).json({ error: "Template has no HTML content configured." });
        }

        const pdfBuffer = await renderHtmlToPdf(
            template.htmlContent,
            formData || {},
            { orientation: template.orientation || 'portrait' }
        );

        console.log(`[DocGen] Draft preview generated for template "${template.name}" (${pdfBuffer.length} bytes)`);
        res.contentType('application/pdf').send(pdfBuffer);
    } catch (err) {
        console.error("Draft Preview Error:", err);
        res.status(500).json({ error: err.message || "Failed to generate draft preview" });
    }
});

// POST /api/documents (Upload new document — manual PDF upload)
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
// POST /api/documents/generate (Generate document from HTML template)
// Pipeline: Handlebars compile → Puppeteer render → pdf-lib stamp/attach
// =====================================================================
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
        const signatureCoordsStr = req.body.signatureCoords || null;
        const isPreview = req.body.isPreview === 'true';
        
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
        if (!template.htmlContent) {
            return res.status(400).json({ error: "Template has no HTML content configured. Please update the template in Admin panel." });
        }

        const combinedTitle = `${template.name} - ${documentTitle || 'Untitled'}`;

        // ===== STEP 1: Generate base PDF via Puppeteer =====
        console.log(`[DocGen] Rendering HTML template "${template.name}" via Puppeteer...`);
        const basePdfBuffer = await renderHtmlToPdf(
            template.htmlContent,
            formData,
            { orientation: template.orientation || 'portrait' }
        );
        console.log(`[DocGen] Base PDF generated: ${basePdfBuffer.length} bytes`);

        // If isPreview (for CreatorSignatureModal), return buffer directly — no stamp, no save
        if (isPreview) {
            res.setHeader('Content-Length', basePdfBuffer.length);
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(basePdfBuffer);
        }

        // ===== STEP 2: Load into pdf-lib for stamping & attachments =====
        const pdfDoc = await PDFDocument.load(basePdfBuffer);

        // ===== STEP 3: CREATOR SIGNATURE STAMPING =====
        let parsedCoords = null;
        if (signatureCoordsStr) {
            try {
                parsedCoords = JSON.parse(signatureCoordsStr);
            } catch (e) {
                console.warn("[DocGen] Failed to parse signatureCoords:", e.message);
            }
        }

        if (parsedCoords && parsedCoords.pageIndex !== undefined && parsedCoords.x !== undefined && parsedCoords.y !== undefined) {
            // Retrieve Creator's Signature
            const [sigRecord] = await db.select().from(signature).where(eq(signature.userId, req.user.id)).limit(1);
            if (!sigRecord) {
                return res.status(400).json({ error: "Your account does not have a signature configured. Please contact the administrator." });
            }

            const signaturePath = sigRecord.imagePath;
            if (fs.existsSync(signaturePath)) {
                try {
                    const signatureBytes = fs.readFileSync(signaturePath);
                    let embeddedSig;
                    if (signaturePath.toLowerCase().endsWith('.png')) {
                        embeddedSig = await pdfDoc.embedPng(signatureBytes);
                    } else {
                        embeddedSig = await pdfDoc.embedJpg(signatureBytes);
                    }

                    const targetPage = pdfDoc.getPage(parsedCoords.pageIndex);
                    // Standard visual signature width = 120px
                    const drawWidth = 120;
                    const aspect = embeddedSig.width / embeddedSig.height;
                    const drawHeight = drawWidth / aspect;

                    // Note: Coordinates from React-PDF are from top-left, pdf-lib is from bottom-left
                    // parsedCoords.y is already converted by CreatorSignatureModal frontend
                    targetPage.drawImage(embeddedSig, {
                        x: parsedCoords.x,
                        y: parsedCoords.y,
                        width: drawWidth,
                        height: drawHeight,
                    });
                    console.log(`[DocGen] ✅ Creator signature stamped at page ${parsedCoords.pageIndex}, (${parsedCoords.x}, ${parsedCoords.y})`);
                } catch (sigErr) {
                    console.warn("[DocGen] Failed to embed creator signature:", sigErr.message);
                }
            } else {
                console.warn("[DocGen] Creator signature image file missing:", signaturePath);
            }
        }

        // ===== STEP 4: IMAGE ATTACHMENTS — Embed as grid pages =====
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
            
            // Embed fonts for the "Lampiran" header
            const { StandardFonts, rgb } = await import('pdf-lib');
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            let attachPage = pdfDoc.addPage([pgW, pgH]);
            // Draw "Lampiran" header
            attachPage.drawText('Lampiran', {
                x: margin, y: pgH - margin - 20,
                size: 16, font: boldFont, color: rgb(0, 0, 0),
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

        // ===== STEP 5: SAVE GENERATED PDF =====
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

        // ===== STEP 6: CREATE DOCUMENT RECORD =====
        const data = {
            title: combinedTitle,
            category,
            subCategory: subCategory || null,
            branch,
            department: department || null,
            notes: notes || null,
            filePath: generatedPath,   // ← points to GENERATED file, not template
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
