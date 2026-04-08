import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleService } from '../services/role.service.js';

const router = express.Router();

// Prefix: /api/admin/roles

router.get('/', requireAuth, async (req, res) => {
    try {
        const list = await RoleService.getAllRoles();
        res.json(list);
    } catch (err) {
        console.error("Get Roles Error:", err);
        res.status(500).json({ error: "Failed to fetch roles" });
    }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const newRole = await RoleService.addRole(id, name);
        res.status(201).json(newRole);
    } catch (err) {
        console.error("Add Role Error:", err);
        res.status(500).json({ error: "Failed to add role" });
    }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        await RoleService.deleteRole(req.params.id);
        res.json({ message: "Role deleted" });
    } catch (err) {
        console.error("Delete Role Error:", err);
        res.status(500).json({ error: "Failed to delete role" });
    }
});

export default router;
