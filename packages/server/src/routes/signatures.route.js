import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { SignatureService } from '../services/signature.service.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Setup Multer for Signature image uploads (PNG only ideally)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.SIGNATURE_STORAGE_PATH || './storage/signatures');
    },
    filename: function (req, file, cb) {
        // Save as {userId}-sig.png
        const targetUserId = req.body.userId || 'unknown';
        cb(null, `user-${targetUserId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only PNG images are allowed for signatures!'), false);
        }
    }
});

// Prefix: /api/admin/signatures

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const list = await SignatureService.getAllSignatures();
        res.json(list);
    } catch (err) {
        console.error("Get Signatures Error:", err);
        res.status(500).json({ error: "Failed to fetch signatures" });
    }
});

router.post('/', requireAuth, requireRole('admin'), upload.single('signatureImage'), async (req, res) => {
    try {
        const targetUserId = req.body.userId;
        const uploaderId = req.user.id;

        if (!req.file || !targetUserId) {
            return res.status(400).json({ error: "Missing signature file or target User ID" });
        }

        const saved = await SignatureService.saveSignature(targetUserId, req.file.path, uploaderId);

        res.status(201).json(saved);
    } catch (err) {
        console.error("Upload Signature Error:", err);
        res.status(500).json({ error: err.message || "Failed to save signature" });
    }
});

export default router;
