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

// Setup Multer for manual PDF file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const pendingPath = path.join(process.env.DOCUMENT_STORAGE_PATH || './storage/documents', 'pending');
        if (!fs.existsSync(pendingPath)) {
            fs.mkdirSync(pendingPath, { recursive: true });
        }
        cb(null, pendingPath);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const originalName = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 60);
        cb(null, `${originalName}_${timestamp}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

const generateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only image and PDF files are allowed as attachments'), false);
    }
});

// Prefix: /api/documents

// GET /api/documents (List with pagination and filters)
router.get('/', requireAuth, async (req, res) => {
    try {
        const filters = {};
        if (req.query.startDate) filters.startDate = req.query.startDate;
        if (req.query.endDate) filters.endDate = req.query.endDate;
        if (req.query.subCategory) filters.subCategory = req.query.subCategory;
        if (req.query.branch) filters.branch = req.query.branch;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.search) filters.search = req.query.search;
        if (req.query.page) filters.page = parseInt(req.query.page);
        if (req.query.limit) filters.limit = parseInt(req.query.limit);
        
        const result = await DocumentService.listDocuments(filters);
        res.json(result);
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
        // Efficient check: can this user approve this specific document?
        doc.canIApprove = await DocumentService.canUserApproveDocument(
            doc.id, 
            req.user.id, 
            req.user.role || ''
        );

        res.json(doc);
    } catch (err) {
        console.error("Get Document Error:", err);
        res.status(500).json({ error: "Failed to fetch document" });
    }
});

// GET /api/documents/:id/file (Stream document PDF)
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
        if (!path.isAbsolute(filePath)) {
            absolutePath = path.resolve(process.cwd(), filePath);
            if (!fs.existsSync(absolutePath) && process.env.DOCUMENT_STORAGE_PATH) {
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

// POST /api/documents/draft-preview (Generate a preview PDF from template)
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
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message || "Failed to create document" });
    }
});
// =====================================================================
// POST /api/documents/generate (Generate document from template + form data)
// =====================================================================
router.post('/generate', requireAuth, generateUpload.array('attachments', 10), async (req, res) => {
    try {
        const { templateId, formData, category, branch, department, subCategory, notes, title } = req.body;

        if (!templateId) throw new Error("Missing required field: templateId");
        if (!category || !branch) throw new Error("Category and Branch are required");

        const [template] = await db.select().from(documentTemplate).where(eq(documentTemplate.id, templateId));
        if (!template) throw new Error("Template not found");
        if (!template.htmlContent) throw new Error("Template has no HTML content configured.");

        // Parse formData from JSON string if needed
        const parsedFormData = typeof formData === 'string' ? JSON.parse(formData) : (formData || {});

        // Generate combined title
        const combinedTitle = title || parsedFormData.documentTitle || template.name || "Generated Document";

        // ===== STEP 1: RENDER HTML TO PDF =====
        const pdfBuffer = await renderHtmlToPdf(
            template.htmlContent,
            parsedFormData,
            { orientation: template.orientation || 'portrait' }
        );

        // ===== STEP 2: MERGE ATTACHMENTS (Images + PDFs) =====
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files;
        } else if (req.body.attachmentsJson) {
            attachments = JSON.parse(req.body.attachmentsJson);
        }

        let pdfDoc;
        let startPageIndex = 0;

        if (attachments.length > 0) {
            pdfDoc = await PDFDocument.load(pdfBuffer);

            // --- 4a. Process Image Attachments (embed as new pages) ---
            const imageAttachments = attachments.filter(att => att.mimetype?.startsWith('image/'));
            if (imageAttachments.length > 0) {
                for (const att of imageAttachments) {
                    try {
                        const imgBytes = att.buffer || fs.readFileSync(att.path || att.filepath);
                        const ext = att.originalname?.split('.').pop()?.toLowerCase() || 'png';
                        let img;
                        if (ext === 'jpg' || ext === 'jpeg') {
                            img = await pdfDoc.embedJpg(imgBytes);
                        } else if (ext === 'png') {
                            img = await pdfDoc.embedPng(imgBytes);
                        } else {
                            console.warn(`[DocGen] Unsupported image format: ${ext}, attempting as PNG`);
                            try { img = await pdfDoc.embedPng(imgBytes); } catch { img = await pdfDoc.embedJpg(imgBytes); }
                        }
                        // Use tallest fitting size
                        const { width: pageWidth, height: pageHeight } = pdfDoc.getPage(0).getSize();
                        const imgDims = img.scaleToFit(pageWidth * 0.85, pageHeight * 0.85);
                        const page = pdfDoc.addPage([pageWidth, pageHeight]);
                        page.drawImage(img, {
                            x: (pageWidth - imgDims.width) / 2,
                            y: (pageHeight - imgDims.height) / 2,
                            width: imgDims.width,
                            height: imgDims.height,
                        });
                    } catch (imgErr) {
                        console.warn(`[DocGen] Failed to embed image ${att.originalname}:`, imgErr.message);
                    }
                }
            }

            // --- 4b. Process PDF Attachments (merge pages) ---
            const pdfAttachments = attachments.filter(att => att.mimetype === 'application/pdf');
            if (pdfAttachments.length > 0) {
                for (const att of pdfAttachments) {
                    try {
                        const pdfBytes = att.buffer || fs.readFileSync(att.path || att.filepath);
                        const attDoc = await PDFDocument.load(pdfBytes);
                        const copiedPages = await pdfDoc.copyPages(attDoc, attDoc.getPageIndices());
                        for (const page of copiedPages) {
                            pdfDoc.addPage(page);
                        }
                        console.log(`[DocGen] Appended ${copiedPages.length} pages from PDF: ${att.originalname}`);
                    } catch (pdfErr) {
                        console.warn(`[DocGen] Failed to merge PDF ${att.originalname}:`, pdfErr.message);
                    }
                }
            }
        }

        // ===== SAVE GENERATED PDF =====
        const flatPdfBytes = pdfDoc ? await pdfDoc.save() : pdfBuffer;

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

        // ===== CREATE DOCUMENT RECORD =====
        const data = {
            title: combinedTitle,
            category,
            subCategory: subCategory || null,
            branch,
            department: department || null,
            notes: notes || null,
            filePath: generatedPath,
            originalName: filename,
            uploadedBy: req.user.id,
            dynamicDepartments: []
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
