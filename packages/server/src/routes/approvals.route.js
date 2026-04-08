import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ApprovalService } from '../services/approval.service.js';

const router = express.Router();

// Prefix: /api/approvals

// GET /api/approvals/pending
router.get('/pending', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role || 'initiator';
        const filters = {};
        if (req.query.startDate) filters.startDate = req.query.startDate;
        if (req.query.endDate) filters.endDate = req.query.endDate;
        if (req.query.branch) filters.branch = req.query.branch;
        
        const items = await ApprovalService.getPendingApprovals(userId, role, filters);
        res.json(items);
    } catch (err) {
        console.error("Get Pending Approvals Error:", err);
        res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
});

// GET /api/approvals/pending/count
router.get('/pending/count', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role || 'initiator';
        const filters = {};
        if (req.query.branch) filters.branch = req.query.branch;

        const items = await ApprovalService.getPendingApprovals(userId, role, filters);
        res.json({ count: items.length });
    } catch (err) {
        console.error("Get Pending Approvals Count Error:", err);
        res.status(500).json({ error: "Failed to fetch pending approvals count" });
    }
});

// POST /api/approvals/:id/action
router.post('/:id/action', requireAuth, async (req, res) => {
    try {
        const { action, comment } = req.body; // action: 'approve' | 'reject'
        const approvalId = req.params.id;
        const userId = req.user.id;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "Invalid action type. Must be 'approve' or 'reject'" });
        }

        const result = await ApprovalService.processApproval(approvalId, userId, action, comment);

        res.json(result);
    } catch (err) {
        console.error("Process Approval Error:", err);
        if (err.message.includes('403_FORBIDDEN')) {
            return res.status(403).json({ error: "Forbidden: You do not have branch access for this action" });
        }
        res.status(500).json({ error: err.message || "Internal Server Error during approval process" });
    }
});

export default router;
