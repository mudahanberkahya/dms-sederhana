import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { WorkflowService } from '../services/workflow.service.js';

const router = express.Router();

// Prefix: /api/admin/workflows
// Requires 'admin' role for all actions. 
// Note: We use `requireRole('admin')` which relies on the strict bypass or direct role match in rbac.js

router.get('/:category', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const data = await WorkflowService.getWorkflowByCategory(req.params.category);
        res.json(data);
    } catch (err) {
        console.error("Get Workflows Error:", err);
        res.status(500).json({ error: "Failed to fetch workflows" });
    }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { category, branch, steps } = req.body;

        if (!category || !branch || !Array.isArray(steps)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        const result = await WorkflowService.saveWorkflow(category, branch, steps);
        res.status(201).json({ message: "Workflow saved", workflowId: result.id });
    } catch (err) {
        console.error("Save Workflow Error:", err);
        res.status(500).json({ error: "Failed to save workflow" });
    }
});

export default router;
