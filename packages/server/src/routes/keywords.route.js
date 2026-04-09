import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { KeywordService } from '../services/keyword.service.js';

const router = express.Router();

// Prefix: /api/admin/keywords

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const list = await KeywordService.getAllKeywords();
        res.json(list);
    } catch (err) {
        console.error("Get Keywords Error:", err);
        res.status(500).json({ error: "Failed to fetch keywords" });
    }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { category, sub_category, branch, role, keyword, offset_x, offset_y, positionHint } = req.body;

        if (!category || !role || !keyword) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newMapping = await KeywordService.addKeywordMapping({ 
            category, 
            sub_category: sub_category || null,
            branch: branch || 'All', 
            role, 
            keyword, 
            offset_x: offset_x || 0, 
            offset_y: offset_y || 0, 
            positionHint 
        });
        res.status(201).json(newMapping);
    } catch (err) {
        console.error("Add Keyword Error:", err);
        res.status(500).json({ error: "Failed to add keyword mapping" });
    }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { category, sub_category, branch, role, keyword, offset_x, offset_y, positionHint } = req.body;

        if (!category || !role || !keyword) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updatedMapping = await KeywordService.updateKeywordMapping(req.params.id, { 
            category, 
            sub_category: sub_category || null,
            branch: branch || 'All', 
            role, 
            keyword, 
            offset_x: offset_x || 0, 
            offset_y: offset_y || 0, 
            positionHint 
        });
        
        if (!updatedMapping) {
            return res.status(404).json({ error: "Keyword mapping not found" });
        }
        
        res.json(updatedMapping);
    } catch (err) {
        console.error("Update Keyword Error:", err);
        res.status(500).json({ error: "Failed to update keyword mapping" });
    }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        await KeywordService.deleteKeywordMapping(req.params.id);
        res.json({ message: "Keyword mapping deleted" });
    } catch (err) {
        console.error("Delete Keyword Error:", err);
        res.status(500).json({ error: "Failed to delete keyword mapping" });
    }
});

export default router;
