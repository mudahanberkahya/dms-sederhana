import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service.js';
import { WorkflowService } from '../services/workflow.service.js';
import { db } from '../db/index.js';
import { userProfile } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

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

// DELETE /api/documents/:id (Delete document, restricted to Admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const role = req.user.role?.toLowerCase() || '';
        if (role !== 'admin' && role !== 'super_admin' && role !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can delete documents" });
        }

        const success = await DocumentService.deleteDocument(req.params.id);

        if (!success) {
            return res.status(404).json({ error: "Document not found or already deleted" });
        }

        res.json({ message: "Document deleted successfully" });
    } catch (err) {
        console.error("Delete Document Error:", err);
        res.status(500).json({ error: "Failed to delete document" });
    }
});

export default router;
