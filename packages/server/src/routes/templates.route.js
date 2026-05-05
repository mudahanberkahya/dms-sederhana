import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { documentTemplate } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

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

// GET /api/admin/templates/active (For users to query active templates for DocGen)
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

// POST /api/admin/templates (Create new HTML template — pure JSON payload)
router.post('/', requireAuth, async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can create templates" });
        }

        const { name, htmlContent, fieldsConfig, isActive, requireCreatorSignature, orientation } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Template Name is REQUIRED" });
        }

        if (!htmlContent || !htmlContent.trim()) {
            return res.status(400).json({ error: "HTML Content is REQUIRED. Please provide the template body." });
        }

        // Parse fieldsConfig if it's a string
        let parsedFieldsConfig = [];
        if (fieldsConfig) {
            try {
                parsedFieldsConfig = typeof fieldsConfig === 'string' ? JSON.parse(fieldsConfig) : fieldsConfig;
            } catch (err) {
                return res.status(400).json({ error: "Invalid JSON format for fieldsConfig: " + err.message });
            }
        }

        const [newTemplate] = await db.insert(documentTemplate).values({
            name: name.trim(),
            htmlContent: htmlContent,
            orientation: orientation || 'portrait',
            fieldsConfig: parsedFieldsConfig,
            isActive: isActive !== undefined ? isActive : true,
            requireCreatorSignature: requireCreatorSignature === 'true' || requireCreatorSignature === true
        }).returning();

        console.log(`[Templates] ✅ Created template: "${newTemplate.name}" (${newTemplate.id})`);
        res.status(201).json(newTemplate);
    } catch (err) {
        console.error("Create Template Error:", err);
        res.status(500).json({ error: err.message || "Failed to create template" });
    }
});

// PUT /api/admin/templates/:id (Update template — JSON payload)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const userRole = req.user.role?.toLowerCase() || '';
        if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can update templates" });
        }

        const { name, htmlContent, fieldsConfig, isActive, requireCreatorSignature, orientation } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;
        if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
        if (orientation !== undefined) updateData.orientation = orientation;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (requireCreatorSignature !== undefined) updateData.requireCreatorSignature = requireCreatorSignature;
        if (fieldsConfig !== undefined) updateData.fieldsConfig = fieldsConfig;

        const [updatedTemplate] = await db.update(documentTemplate)
            .set(updateData)
            .where(eq(documentTemplate.id, req.params.id))
            .returning();

        if (!updatedTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }

        console.log(`[Templates] ✅ Updated template: "${updatedTemplate.name}" (${updatedTemplate.id})`);
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

        await db.delete(documentTemplate).where(eq(documentTemplate.id, req.params.id));
        console.log(`[Templates] 🗑️ Deleted template: "${template.name}" (${template.id})`);
        res.json({ message: "Template deleted successfully" });
    } catch (err) {
        console.error("Delete Template Error:", err);
        res.status(500).json({ error: "Failed to delete template" });
    }
});

export default router;
