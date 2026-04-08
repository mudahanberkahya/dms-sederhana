import express from 'express';
import DepartmentService from '../services/department.service.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res, next) => {
    try {
        const departments = await DepartmentService.getAllDepartments();
        res.json(departments);
    } catch (err) {
        next(err);
    }
});

// Create department
router.post('/', async (req, res, next) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) {
            return res.status(400).json({ error: 'ID and Name are required' });
        }
        
        const existing = await DepartmentService.getDepartmentById(id);
        if (existing) {
            return res.status(400).json({ error: 'Department ID already exists' });
        }
        
        const newDept = await DepartmentService.createDepartment({ id, name });
        res.status(201).json(newDept);
    } catch (err) {
        next(err);
    }
});

// Update department
router.put('/:id', async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const updated = await DepartmentService.updateDepartment(req.params.id, { name });
        if (!updated) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Delete department
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await DepartmentService.deleteDepartment(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

export default router;
