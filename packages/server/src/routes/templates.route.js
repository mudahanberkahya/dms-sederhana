import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { documentTemplate } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Setup Multer for Base Template PDF file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const templatePath = path.join(process.env.DOCUMENT_STORAGE_PATH || './storage/documents', 'templates');
        if (!fs.existsSync(templatePath)) {
            fs.mkdirSync(templatePath, { recursive: true });
        }
        cb(null, templatePath);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const originalName = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 60);
        cb(null, `template_${originalName}_${timestamp}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// Prefix: /api/admin/templates

// GET /api/admin/templates
router.get('/', requireAuth, async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can view templates here" });
        }

        const templates = await db
            .select()
            .from(documentTemplate)
            .orderBy(desc(documentTemplate.createdAt));
            
        res.json(templates);
    } catch (err) {
        console.error("List Templates Error:", err);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
});

// GET /api/admin/templates/active (Actually for Users to query active templates)
// Should probably be placed in a public/non-admin route, but we'll include it here with relaxed role check just in case, or we use a different route.
// Actually, let's keep it in this router but without the strict admin check, since users need to see them to create docs.
router.get('/active', requireAuth, async (req, res) => {
    try {
        const templates = await db
            .select()
            .from(documentTemplate)
            .where(eq(documentTemplate.isActive, true))
            .orderBy(desc(documentTemplate.name));
            
        res.json(templates);
    } catch (err) {
        console.error("List Active Templates Error:", err);
        res.status(500).json({ error: "Failed to fetch active templates" });
    }
});

// POST /api/admin/templates (Upload new template)
router.post('/', requireAuth, upload.single('templateFile'), async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: "Forbidden: Only administrators can upload templates" });
        }

        const { name, fieldsConfig } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: "No PDF template file uploaded" });
        }

        if (!name) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Template Name is REQUIRED" });
        }

        let parsedFieldsConfig = [];
        try {
            if (fieldsConfig) {
                // If Frontend sent manual configuration mapping, prioritize it!
                parsedFieldsConfig = JSON.parse(fieldsConfig);
            } else {
                // Auto-extract AcroForm fields directly from the uploaded Nitro PDF as a fallback
                const pdfBytes = fs.readFileSync(req.file.path);
                const pdfDoc = await PDFDocument.load(pdfBytes);
                const form = pdfDoc.getForm();
                const fields = form.getFields();
                
                if (fields.length > 0) {
                    parsedFieldsConfig = fields.map(f => {
                        const fieldName = f.getName();
                        let type = 'text';
                        if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('qty') || fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('total')) {
                            type = 'number';
                        } else if (fieldName.toLowerCase().includes('date')) {
                            type = 'date';
                        } else if (fieldName.toLowerCase().includes('note') || fieldName.toLowerCase().includes('desc')) {
                            type = 'textarea';
                        }
                        return {
                            name: fieldName,
                            label: fieldName.replace(/_/g, ' '),
                            type: type,
                            page: 1
                        };
                    });
                }
            }
        } catch (err) {
            console.warn("Failed to parse fieldsConfig or read PDF form", err);
            // Ignore error, use default []
        }

        const [newTemplate] = await db.insert(documentTemplate).values({
            name,
            filePath: req.file.path,
            fieldsConfig: parsedFieldsConfig,
            isActive: true
        }).returning();

        res.status(201).json(newTemplate);
    } catch (err) {
        console.error("Create Template Error:", err);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkErr) { }
        }
        res.status(500).json({ error: err.message || "Failed to create template" });
    }
});

// POST /api/admin/templates/extract-fields (Extract AcroForm fields for frontend mapping)
router.post('/extract-fields', requireAuth, upload.single('templateFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const extracted = fields.map(f => {
            const fieldName = f.getName();
            let type = 'text';
            if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('qty') || fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('total')) {
                type = 'number';
            } else if (fieldName.toLowerCase().includes('date')) {
                type = 'date';
            } else if (fieldName.toLowerCase().includes('note') || fieldName.toLowerCase().includes('desc')) {
                type = 'textarea';
            }
            return {
                name: fieldName,
                label: fieldName.replace(/_/g, ' '),
                type: type,
                page: 1
            };
        });

        // Cleanup the temporary file
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({ fieldsConfig: extracted });
    } catch (err) {
        console.error("Extract Fields Error:", err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: "Failed to extract fields from PDF" });
    }
});

// PUT /api/admin/templates/:id (Update template - name, fieldsConfig, isActive)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can update templates" });
        }

        const { name, fieldsConfig, isActive } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (fieldsConfig !== undefined) updateData.fieldsConfig = fieldsConfig;

        const [updatedTemplate] = await db.update(documentTemplate)
            .set(updateData)
            .where(eq(documentTemplate.id, req.params.id))
            .returning();

        if (!updatedTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }

        res.json(updatedTemplate);
    } catch (err) {
        console.error("Update Template Error:", err);
        res.status(500).json({ error: "Failed to update template" });
    }
});

// DELETE /api/admin/templates/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can delete templates" });
        }

        const [template] = await db.select().from(documentTemplate).where(eq(documentTemplate.id, req.params.id));
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }

        // Technically, you might want to prevent deleting a template if documents are linked to it in the future.
        // For now, physical deletion of file + db mapping.
        if (template.filePath && fs.existsSync(template.filePath)) {
            try { fs.unlinkSync(template.filePath); } catch (e) { console.warn("Failed to delete physical file", e); }
        }

        await db.delete(documentTemplate).where(eq(documentTemplate.id, req.params.id));
        res.json({ message: "Template deleted successfully" });
    } catch (err) {
        console.error("Delete Template Error:", err);
        res.status(500).json({ error: "Failed to delete template" });
    }
});

export default router;
