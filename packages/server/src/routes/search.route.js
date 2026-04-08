import express from 'express';
import { db } from '../db/index.js';
import { document, user } from '../db/schema.js';
import { ilike, or, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.json({ documents: [], users: [] });
        }

        const searchTerm = `%${q.trim()}%`;

        // Search documents (title, displayId)
        const docsResult = await db.select({
            id: document.id,
            displayId: document.displayId,
            title: document.title,
            category: document.category,
            status: document.status
        })
        .from(document)
        .where(
            or(
                ilike(document.displayId, searchTerm),
                ilike(document.title, searchTerm)
            )
        )
        .orderBy(desc(document.createdAt))
        .limit(8);

        // Search users (name, email)
        const usersResult = await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        })
        .from(user)
        .where(
            or(
                ilike(user.name, searchTerm),
                ilike(user.email, searchTerm)
            )
        )
        .limit(5);

        res.json({
            documents: docsResult,
            users: usersResult
        });
    } catch (err) {
        console.error('Search API Error:', err);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

export default router;
