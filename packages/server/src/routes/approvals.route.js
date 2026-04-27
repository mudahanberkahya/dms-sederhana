import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ApprovalService } from '../services/approval.service.js';
import { DocumentService } from '../services/document.service.js';
import { PdfService } from '../services/pdf.service.js';
import { db } from '../db/index.js';
import { keywordMapping } from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';

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
        const { action, comment, signatureConfig } = req.body; // action: 'approve' | 'reject', signatureConfig: optional visual coordinates
        const approvalId = req.params.id;
        const userId = req.user.id;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "Invalid action type. Must be 'approve' or 'reject'" });
        }

        const result = await ApprovalService.processApproval(approvalId, userId, action, comment, signatureConfig);

        res.json(result);
    } catch (err) {
        console.error("Process Approval Error:", err);
        if (err.message.includes('403_FORBIDDEN')) {
            return res.status(403).json({ error: "Forbidden: You do not have branch access for this action" });
        }
        res.status(500).json({ error: err.message || "Internal Server Error during approval process" });
    }
});

// POST /api/approvals/sync
router.post('/sync', requireAuth, async (req, res) => {
    try {
        const role = req.user.role?.toLowerCase() || '';
        if (role !== 'admin' && role !== 'super_admin' && role !== 'superadmin') {
            return res.status(403).json({ error: "Forbidden: Only administrators can sync stuck documents" });
        }

        const result = await ApprovalService.syncStuckDocuments();
        res.json(result);
    } catch (err) {
        console.error("Sync Approvals Error:", err);
        res.status(500).json({ error: "Failed to synchronize stuck approvals" });
    }
});
// GET /api/approvals/:documentId/signature-hint
// Returns the preconfigured keyword offset for the current pending approval step
router.get('/:documentId/signature-hint', requireAuth, async (req, res) => {
    try {
        const doc = await DocumentService.getDocumentById(req.params.documentId);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        // Find the current PENDING step
        const chain = doc.approvalChain || [];
        const currentStep = chain.find(s => s.status === 'PENDING');
        if (!currentStep) {
            return res.json({ offset_x: 0, offset_y: 0, positionHint: null, page: 1 });
        }

        // Query keyword_mapping for this category + role + branch (same logic as approval.service.js)
        let kwResults = [];

        // Try with subCategory first
        if (doc.subCategory) {
            kwResults = await db.select().from(keywordMapping)
                .where(and(
                    eq(keywordMapping.category, doc.category),
                    eq(keywordMapping.role, currentStep.roleRequired),
                    eq(keywordMapping.subCategory, doc.subCategory),
                    or(
                        eq(keywordMapping.stepOrder, currentStep.stepOrder),
                        isNull(keywordMapping.stepOrder)
                    ),
                    or(
                        eq(keywordMapping.branch, doc.branch),
                        eq(keywordMapping.branch, 'All')
                    )
                ));
        }

        // Fallback without subCategory
        if (kwResults.length === 0) {
            kwResults = await db.select().from(keywordMapping)
                .where(and(
                    eq(keywordMapping.category, doc.category),
                    eq(keywordMapping.role, currentStep.roleRequired),
                    or(
                        eq(keywordMapping.stepOrder, currentStep.stepOrder),
                        isNull(keywordMapping.stepOrder)
                    ),
                    or(
                        eq(keywordMapping.branch, doc.branch),
                        eq(keywordMapping.branch, 'All')
                    )
                ));
        }

        // Prioritize exact stepOrder, then exact branch
        const exactStep = kwResults.filter(k => k.stepOrder === currentStep.stepOrder);
        const candidates = exactStep.length > 0 ? exactStep : kwResults;
        const kw = candidates.find(k => k.branch === doc.branch) || candidates.find(k => k.branch === 'All') || null;

        if (!kw) {
            return res.json({ offset_x: 0, offset_y: 0, positionHint: null, page: 1 });
        }

        // We have the keyword. Let's find its EXACT absolute coordinates on the PDF.
        const position = await PdfService.findKeywordPosition(
            doc.filePath,
            kw.keyword,
            kw.positionHint,
            kw.offset_x,
            kw.offset_y
        );

        if (position) {
            return res.json({
                offset_x: position.x, // Absolute X coordinate in PDF Space! 
                offset_y: position.y, // Absolute Y coordinate in PDF Space!
                positionHint: kw.positionHint,
                page: position.page
            });
        }

        // If Python script failed or keyword wasn't actually found in PDF
        res.json({
            offset_x: kw.offset_x || 0,
            offset_y: kw.offset_y || 0,
            positionHint: kw.positionHint || 'Above',
            page: 1
        });
    } catch (err) {
        console.error("Signature Hint Error:", err);
        res.status(500).json({ error: "Failed to fetch signature hint" });
    }
});

export default router;
