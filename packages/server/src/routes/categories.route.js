import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { CategoryService } from '../services/category.service.js';

const router = express.Router();

// Prefix: /api/admin/categories

router.get('/', requireAuth, async (req, res) => {
    try {
        const list = await CategoryService.getAllCategories();
        res.json(list);
    } catch (err) {
        console.error("Get Categories Error:", err);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const newCat = await CategoryService.addCategory(id, name);
        res.status(201).json(newCat);
    } catch (err) {
        console.error("Add Category Error:", err);
        res.status(500).json({ error: "Failed to add category" });
    }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        await CategoryService.deleteCategory(req.params.id);
        res.json({ message: "Category deleted" });
    } catch (err) {
        console.error("Delete Category Error:", err);
        res.status(500).json({ error: "Failed to delete category" });
    }
});

export default router;
