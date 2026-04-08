import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { document, approval, workflow, workflowStep, userProfile, user } from '../db/schema.js';
import { ApprovalService } from './approval.service.js';

export const DocumentService = {

    /**
     * Create a new document and initialize its approval chain.
     */
    async createDocument(data) {
        const { title, category, branch, department, notes, filePath, originalName, uploadedBy } = data;

        return await db.transaction(async (tx) => {
            // 1. Generate displayId based on category, year, and sequence
            // This is a simplified ID generation for demonstration
            const year = new Date().getFullYear();
            const randomSeq = Math.floor(1000 + Math.random() * 9000); // 4 digit random
            const prefix = category === 'Purchase Order' ? 'PO' : category === 'Cash Advance' ? 'CA' : category === 'Petty Cash' ? 'PC' : 'MM';
            const displayId = `${prefix}-${year}-${randomSeq}`;

            // Rename the uploaded file
            let finalFilePath = filePath;
            if (originalName) {
                const safeOriginalName = path.basename(originalName, path.extname(originalName))
                    .replace(/[^a-zA-Z0-9_-]/g, '_')
                    .substring(0, 60);
                const ext = path.extname(originalName);
                
                const safeBranch = branch ? branch.replace(/[^a-zA-Z0-9-]/g, '_') : 'Uncategorized';
                const dir = path.join(path.dirname(filePath), safeBranch);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                const newFilename = `${safeOriginalName}_${displayId}${ext}`;
                finalFilePath = path.join(dir, newFilename);

                try {
                    await fs.promises.rename(filePath, finalFilePath);
                } catch (err) {
                    console.error("Failed to rename file:", err);
                    finalFilePath = filePath; // fallback to multer assigned name
                }
            }

            // 2. Insert Document
            const [newDoc] = await tx.insert(document).values({
                displayId,
                title,
                category,
                branch,
                department,
                notes,
                filePath: finalFilePath,
                uploadedBy,
                status: 'PENDING'
            }).returning();

            // 3. Find workflow for this category and branch
            console.log(`[DocumentService] Looking for workflow: category="${category}", branch="${branch}"`);
            let wf = await tx.select().from(workflow)
                .where(and(
                    eq(workflow.category, category),
                    eq(workflow.branch, branch)
                ))
                .limit(1);

            if (wf.length === 0) {
                console.log(`[DocumentService] No specific branch workflow found. Falling back to branch="All"`);
                wf = await tx.select().from(workflow)
                    .where(and(
                        eq(workflow.category, category),
                        eq(workflow.branch, 'All')
                    ))
                    .limit(1);
            }

            if (wf.length > 0) {
                console.log(`[DocumentService] Selected Workflow ID: ${wf[0].id}`);
                // 4. Fetch workflow steps
                const steps = await tx.select().from(workflowStep)
                    .where(eq(workflowStep.workflowId, wf[0].id))
                    .orderBy(workflowStep.stepOrder);

                console.log(`[DocumentService] Found ${steps.length} workflow steps`);

                // 5. Create approval chain entries
                if (steps.length > 0) {
                    const approvalsToInsert = steps.map((step, index) => ({
                        documentId: newDoc.id,
                        stepOrder: step.stepOrder,
                        roleRequired: step.roleRequired,
                        assignedUserId: null,
                        status: index === 0 ? 'PENDING' : 'LOCKED',
                    }));

                    const insertedApprovals = await tx.insert(approval).values(approvalsToInsert).returning();
                    console.log(`[DocumentService] Inserted ${insertedApprovals.length} approval entries`);

                    if (insertedApprovals.length > 0) {
                        const firstStep = insertedApprovals[0];
                        await ApprovalService.assignStepToUser(tx, firstStep.id, firstStep.roleRequired, branch, department);
                    }
                } else {
                    throw new Error(`Workflow found but contains no steps for category: ${category}`);
                }
            } else {
                console.error(`[DocumentService] CRITICAL: No workflow defined for category "${category}" at branch "${branch}" or "All"`);
                throw new Error(`Manajemen tidak menemukan Alur Persetujuan (Workflow) untuk kategori "${category}". Mohon hubungi Administrator.`);
            }

            return newDoc;
        });
    },

    /**
     * Get all documents with optional date range filtering.
     * @param {Object} filters - Optional filters: { startDate, endDate }
     */
    async listDocuments(filters = {}) {
        const conditions = [];

        if (filters.startDate) {
            conditions.push(gte(document.createdAt, new Date(filters.startDate)));
        }
        if (filters.endDate) {
            // Set endDate to end of day
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            conditions.push(lte(document.createdAt, endOfDay));
        }

        let query = db.select({
            document: document,
            uploaderName: user.name
        })
        .from(document)
        .leftJoin(user, eq(document.uploadedBy, user.id));

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const docs = await query.orderBy(
            sql`CASE WHEN ${document.status} = 'PENDING' THEN 0 WHEN ${document.status} = 'APPROVED' THEN 1 ELSE 2 END`,
            desc(document.createdAt)
        );
        
        return docs.map(d => ({
            ...d.document,
            uploaderUser: { name: d.uploaderName }
        }));
    },

    /**
     * Get document by ID including its approval chain
     */
    async getDocumentById(documentId) {
        const [result] = await db.select({
            doc: document,
            uploaderName: user.name
        })
        .from(document)
        .leftJoin(user, eq(document.uploadedBy, user.id))
        .where(eq(document.id, documentId))
        .limit(1);

        if (!result) return null;
        
        const doc = {
            ...result.doc,
            uploaderUser: { name: result.uploaderName }
        };

        const approvals = await db.select().from(approval)
            .where(eq(approval.documentId, documentId))
            .orderBy(approval.stepOrder);

        return { ...doc, approvalChain: approvals };
    },

    /**
     * Delete document by ID (and cascade to approvals)
     */
    async deleteDocument(documentId) {
        return await db.transaction(async (tx) => {
            // Approvals cascade is configured or deleted manually here
            await tx.delete(approval).where(eq(approval.documentId, documentId));
            const deleted = await tx.delete(document).where(eq(document.id, documentId)).returning();
            return deleted.length > 0;
        });
    }
};
