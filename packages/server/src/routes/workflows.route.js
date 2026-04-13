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
        const { category, branch, steps, subCategory } = req.body;
        console.log(`[Workflow Save] category=${category}, branch=${branch}, subCategory=${subCategory || 'null'}, steps=${steps?.length}`);

        if (!category || !branch || !Array.isArray(steps)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        const result = await WorkflowService.saveWorkflow(category, branch, steps, subCategory || null);
        console.log(`[Workflow Save] Success! workflowId=${result.id}`);
        res.status(201).json({ message: "Workflow saved", workflowId: result.id });
    } catch (err) {
        console.error("Save Workflow Error:", err);
        res.status(500).json({ error: "Failed to save workflow" });
    }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        await WorkflowService.deleteWorkflow(req.params.id);
        res.json({ message: "Workflow deleted successfully" });
    } catch (err) {
        console.error("Delete Workflow Error:", err);
        res.status(500).json({ error: "Failed to delete workflow" });
    }
});

export default router;
