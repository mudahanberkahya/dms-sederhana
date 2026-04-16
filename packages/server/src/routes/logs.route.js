import { Router } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { LogService } from '../services/log.service.js';

const router = Router();

/**
 * GET /api/logs
 * Query params: limit, offset, action, startDate, endDate
 * Returns: { logs: [...], total: number }
 */
router.get('/', async (req, res) => {
    try {
        // Require authentication
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        if (!session) return res.status(401).json({ error: 'Unauthorized' });

        const { limit = 20, offset = 0, action, startDate, endDate } = req.query;

        const result = await LogService.getLogs({
            limit: Math.min(parseInt(limit) || 20, 100), // Cap at 100
            offset: parseInt(offset) || 0,
            action: action || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        });

        res.json(result);
    } catch (err) {
        console.error('[Logs Route] Error:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
