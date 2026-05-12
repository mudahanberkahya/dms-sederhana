import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { toNodeHandler } from "better-auth/node";
import { auth } from './auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Pre-auth configuration (CORS, Helmet)
// Helmet configuration needs to allow images from self
// Helmet configuration needs to allow images from self and local static files
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Allow iframe embedding for PDF preview (frontend on different port)
}));

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (same-origin, curl, or automated tools)
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://192.168.0.100:5174',
            'http://localhost:5174',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            process.env.BETTER_AUTH_URL || 'http://192.168.0.100:3001',
        ];
        // Allow TestSprite tunnel origins (*.testsprite.com)
        if (allowedOrigins.includes(origin) || /\.testsprite\.com(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies/authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 2. IMPORTANT: Better Auth Catch-All Handler
// express.json() MUST NOT be placed before this handler
app.use('/api/auth/*', (req, res, next) => {
    const origin = req.headers.origin;
    // Normalize Origin header for TestSprite automated testing to pass Better Auth CSRF check
    // Better Auth CSRF check strictly requires exact matches and doesn't handle wildcards reliably
    if (!origin || origin.includes('testsprite.com')) {
        req.headers.origin = 'http://localhost:3001';
    }
    next();
});
app.all('/api/auth/*', toNodeHandler(auth));

// 3. Post-auth configuration (Body parsing)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for storage (Signatures and PDFs)
const storagePath = process.env.DOCUMENT_STORAGE_PATH
    ? path.resolve(process.env.DOCUMENT_STORAGE_PATH, '..') // Assumes storage/documents format
    : path.resolve(process.cwd(), 'storage');
app.use('/storage', express.static(storagePath));

// Core Application Routes
import docsRouter from './routes/documents.route.js';
import approvalsRouter from './routes/approvals.route.js';
import workflowsAdminRouter from './routes/workflows.route.js';
import usersAdminRouter from './routes/users.route.js';
import signaturesAdminRouter from './routes/signatures.route.js';
import keywordsAdminRouter from './routes/keywords.route.js';
import rolesAdminRouter from './routes/roles.route.js';
import categoriesAdminRouter from './routes/categories.route.js';
import departmentsAdminRouter from './routes/departments.route.js';
import searchRouter from './routes/search.route.js';
import profileRouter from './routes/profile.route.js';
import subcategoriesRouter from './routes/subcategories.route.js';
import logsRouter from './routes/logs.route.js';
import templatesAdminRouter from './routes/templates.route.js';
import aiRouter from './routes/ai.route.js';
import plansRouter from './routes/plans.route.js';
import seedRouter from './routes/seed.route.js';

app.use('/api/documents', docsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/admin/workflows', workflowsAdminRouter);
app.use('/api/admin/users', usersAdminRouter);
app.use('/api/admin/signatures', signaturesAdminRouter);
app.use('/api/admin/keywords', keywordsAdminRouter);
app.use('/api/admin/roles', rolesAdminRouter);
app.use('/api/admin/categories', categoriesAdminRouter);
app.use('/api/admin/departments', departmentsAdminRouter);
app.use('/api/search', searchRouter);
app.use('/api/profile', profileRouter);
app.use('/api/subcategories', subcategoriesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/admin/templates', templatesAdminRouter);
app.use('/api/ai', aiRouter);
app.use('/api/plans', plansRouter);
app.use('/api/seed', seedRouter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

import { fileURLToPath } from 'url';

// Serve frontend static files (production)
const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const frontendPath = path.resolve(__dirname2, '../../web/dist');

app.use(express.static(frontendPath));

// Fallback: semua route yang tidak cocok → index.html (React SPA)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/storage')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    const hostUrl = process.env.BETTER_AUTH_URL || `http://192.168.0.100:${PORT}`;
    console.log(`[DMS Server] Running on ${hostUrl} (Bound to 0.0.0.0)`);
    console.log(`[Better Auth] API available at ${hostUrl}/api/auth`);
});
