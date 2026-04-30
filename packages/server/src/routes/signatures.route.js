import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { SignatureService } from '../services/signature.service.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

import fs from 'fs';

// Setup Multer for Signature image uploads (PNG only ideally)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = process.env.SIGNATURE_STORAGE_PATH || './storage/signatures';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Use a temp name; we'll rename after multer finishes parsing the body
        cb(null, `sig-upload-${Date.now()}${path.extname(file.originalname)}`);
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

router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    // Wrap multer in a manual call so we can catch disk/filter errors as JSON
    upload.single('signatureImage')(req, res, async (multerErr) => {
        if (multerErr) {
            console.error("Multer Signature Upload Error:", multerErr);
            return res.status(400).json({ error: multerErr.message || "File upload failed" });
        }

        try {
            const targetUserId = req.body.userId;
            const uploaderId = req.user.id;

            if (!req.file || !targetUserId) {
                return res.status(400).json({ error: "Missing signature file or target User ID" });
            }

            // Rename the temp file to include the actual userId
            const dir = path.dirname(req.file.path);
            const ext = path.extname(req.file.originalname);
            const finalName = `user-${targetUserId}-${Date.now()}${ext}`;
            const finalPath = path.join(dir, finalName);
            fs.renameSync(req.file.path, finalPath);

            console.log(`[Signatures] Upload success: targetUser=${targetUserId}, file=${finalPath}`);

            const saved = await SignatureService.saveSignature(targetUserId, finalPath, uploaderId);

            res.status(201).json(saved);
        } catch (err) {
            console.error("Upload Signature Error:", err);
            res.status(500).json({ error: err.message || "Failed to save signature" });
        }
    });
});

export default router;
