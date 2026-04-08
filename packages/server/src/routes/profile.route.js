import express from 'express';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { userProfile } from '../db/schema.js';

const router = express.Router();

// Get current user's DMS profile
router.get('/', requireAuth, async (req, res) => {
    try {
        const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, req.user.id)).limit(1);
        
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        res.json({
            branches: profile.branches || [],
            department: profile.department || '',
            isAbsent: profile.isAbsent,
            delegatedToUserId: profile.delegatedToUserId,
            absenceStartDate: profile.absenceStartDate,
            absenceEndDate: profile.absenceEndDate
        });
    } catch (err) {
        console.error("Get Profile Error:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

export default router;
