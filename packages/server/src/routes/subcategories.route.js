import express from 'express';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { workflow } from '../db/schema.js';

const router = express.Router();

// GET /api/subcategories?category=Memo
// Returns distinct sub_category values for a given category (from workflow table)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ error: "category query param is required" });
        }

        const results = await db.selectDistinct({ subCategory: workflow.subCategory })
            .from(workflow)
            .where(eq(workflow.category, category));

        // Filter out null values and return as flat array
        const subCategories = results
            .map(r => r.subCategory)
            .filter(Boolean)
            .sort();

        res.json(subCategories);
    } catch (err) {
        console.error("Get SubCategories Error:", err);
        res.status(500).json({ error: "Failed to fetch sub-categories" });
    }
});

export default router;
