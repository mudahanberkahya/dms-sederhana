import express from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { UserService } from '../services/user.service.js';
import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { user, account } from '../db/schema.js';

const router = express.Router();

// Prefix: /api/admin/users
// Requires admin role

// List all users
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const users = await UserService.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error("Get Users Error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Create new user
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { email, password, name, role, branches, department } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Email, password, and name are required" });
        }

        // Check if user already exists
        const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
        if (existing) {
            return res.status(400).json({ error: "User with this email already exists" });
        }

        // Hash password using the SAME method Better Auth uses for login verification
        const hashedPassword = await hashPassword(password);
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();
        const now = new Date();

        // Insert user
        await db.insert(user).values({
            id: userId,
            name,
            email,
            emailVerified: true,
            role: role || 'initiator',
            banned: false,
            createdAt: now,
            updatedAt: now
        });

        // Insert credential account with properly hashed password
        await db.insert(account).values({
            id: accountId,
            accountId: userId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now
        });

        // Sync DMS profile (branches and department)
        await UserService.syncProfile(userId, branches || ['Astara Hotel'], department);

        res.status(201).json({ success: true, user: { id: userId, name, email, role, branches, department } });
    } catch (err) {
        console.error("Create User Error:", err.message || err);
        res.status(400).json({ error: err.message || "Failed to create user" });
    }
});

// Update user details (name, email, role, branch)
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, role, branches, department } = req.body;
        await UserService.updateUser(req.params.id, { name, email, role, branches, department });
        res.json({ message: "User updated successfully" });
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: err.message || "Failed to update user" });
    }
});

// Reset user password
router.post('/:id/reset-password', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
        await UserService.resetPassword(req.params.id, password);
        res.json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

// Delete user
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.user.id === req.params.id) {
            return res.status(400).json({ error: "Cannot delete your own account" });
        }
        await UserService.deleteUser(req.params.id);
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete User Error:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// Set delegation
router.post('/:id/delegation', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { isAbsent, delegatedToUserId, startDate, endDate } = req.body;
        await UserService.setDelegation(req.params.id, isAbsent, delegatedToUserId, new Date(startDate), new Date(endDate));
        res.json({ message: "Delegation updated successfully" });
    } catch (err) {
        console.error("Update Delegation Error:", err);
        res.status(500).json({ error: "Failed to update delegation" });
    }
});

export default router;
