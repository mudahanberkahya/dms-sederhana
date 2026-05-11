import { eq, desc, sql, and, gte, lte, isNull, like, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { document, approval, workflow, workflowStep, userProfile, user } from '../db/schema.js';
import { ApprovalService } from './approval.service.js';
import { LogService } from './log.service.js';

export const DocumentService = {

    /**
     * Generate sequential display ID within a transaction.
     * Format: {PREFIX}-{YEAR}-{SEQ} (e.g., PO-2026-0042)
     */
    async generateDisplayId(tx, category) {
        const year = new Date().getFullYear();
        const prefix = category === 'Purchase Order' ? 'PO' : 
                       category === 'Cash Advance' ? 'CA' : 
                       category === 'Petty Cash' ? 'PC' : 'MM';
        
        // Count existing docs with this prefix+year for sequential numbering
        const [result] = await tx.select({
            count: sql`COUNT(*)::int`
        })
        .from(document)
        .where(like(document.displayId, `${prefix}-${year}-%`));
        
        const seq = (result?.count || 0) + 1;
        return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    },

    /**
     * Create a new document and initialize its approval chain.
     */
    async createDocument(data) {
        const { title, category, subCategory, branch, department, notes, filePath, originalName, uploadedBy, dynamicDepartments = [] } = data;

        return await db.transaction(async (tx) => {
            // 1. Generate sequential displayId
            const displayId = await DocumentService.generateDisplayId(tx, category);

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
                    finalFilePath = filePath;
                }
            }

            // 2. Insert Document
            const [newDoc] = await tx.insert(document).values({
                displayId,
                title,
                category,
                subCategory: subCategory || null,
                branch,
                department,
                notes,
                filePath: finalFilePath,
                uploadedBy,
                status: 'PENDING'
            }).returning();

            // 3. Find workflow for this category, branch, and subCategory
            console.log(`[DocumentService] Looking for workflow: category="${category}", branch="${branch}", subCategory="${subCategory || 'null'}"`);
            
            let wf = [];
            if (subCategory) {
                wf = await tx.select().from(workflow)
                    .where(and(
                        eq(workflow.category, category),
                        eq(workflow.branch, branch),
                        eq(workflow.subCategory, subCategory)
                    ))
                    .limit(1);
                    
                if (wf.length === 0) {
                    console.log(`[DocumentService] Trying branch="All" + subCategory="${subCategory}"`);
                    wf = await tx.select().from(workflow)
                        .where(and(
                            eq(workflow.category, category),
                            eq(workflow.branch, 'All'),
                            eq(workflow.subCategory, subCategory)
                        ))
                        .limit(1);
                }
            }

            if (wf.length === 0) {
                console.log(`[DocumentService] Trying default: category + branch + null subCategory`);
                wf = await tx.select().from(workflow)
                    .where(and(
                        eq(workflow.category, category),
                        eq(workflow.branch, branch),
                        isNull(workflow.subCategory)
                    ))
                    .limit(1);
            }

            if (wf.length === 0) {
                console.log(`[DocumentService] Falling back to branch="All"`);
                wf = await tx.select().from(workflow)
                    .where(and(
                        eq(workflow.category, category),
                        eq(workflow.branch, 'All'),
                        isNull(workflow.subCategory)
                    ))
                    .limit(1);
            }

            if (wf.length > 0) {
                console.log(`[DocumentService] Selected Workflow ID: ${wf[0].id}`);
                const steps = await tx.select().from(workflowStep)
                    .where(eq(workflowStep.workflowId, wf[0].id))
                    .orderBy(workflowStep.stepOrder);

                console.log(`[DocumentService] Found ${steps.length} workflow steps`);

                if (steps.length > 0) {
                    const approvalsToInsert = steps.map((step, index) => {
                        let targetDepartment = null;
                        if (step.isDynamicDepartment) {
                            const dynDept = dynamicDepartments.find(d => parseInt(d.stepOrder) === step.stepOrder);
                            if (dynDept && dynDept.department) {
                                targetDepartment = dynDept.department;
                                console.log(`[DocumentService] Mapped dynamic targetDepartment=${targetDepartment} for stepOrder=${step.stepOrder}`);
                            }
                        }

                        return {
                            documentId: newDoc.id,
                            stepOrder: step.stepOrder,
                            roleRequired: step.roleRequired,
                            targetDepartment,
                            assignedUserId: null,
                            status: index === 0 ? 'PENDING' : 'LOCKED',
                        };
                    });

                    const insertedApprovals = await tx.insert(approval).values(approvalsToInsert).returning();
                    console.log(`[DocumentService] Inserted ${insertedApprovals.length} approval entries`);

                    if (insertedApprovals.length > 0) {
                        const firstStep = insertedApprovals[0];
                        await ApprovalService.assignStepToUser(
                            tx, 
                            firstStep.id, 
                            firstStep.roleRequired, 
                            branch, 
                            firstStep.targetDepartment || department
                        );
                    }
                } else {
                    throw new Error(`Workflow found but contains no steps for category: ${category}`);
                }
            } else {
                console.error(`[DocumentService] CRITICAL: No workflow defined for category "${category}"`);
                throw new Error(`Manajemen tidak menemukan Alur Persetujuan (Workflow) untuk kategori "${category}". Mohon hubungi Administrator.`);
            }

            LogService.createLog(
                uploadedBy,
                'DOCUMENT_UPLOADED',
                'Document',
                newDoc.id,
                `uploaded document "${title}" (${displayId})`,
                { category, branch, subCategory: subCategory || null }
            );

            return newDoc;
        });
    },

    /**
     * Get all documents with optional filters AND pagination.
     * @param {Object} filters - { startDate, endDate, subCategory, page, limit }
     */
    async listDocuments(filters = {}) {
        const conditions = [];

        if (filters.startDate) {
            conditions.push(gte(document.createdAt, new Date(filters.startDate)));
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            conditions.push(lte(document.createdAt, endOfDay));
        }
        if (filters.subCategory) {
            conditions.push(eq(document.subCategory, filters.subCategory));
        }
        if (filters.branch && filters.branch !== 'All') {
            conditions.push(eq(document.branch, filters.branch));
        }
        if (filters.status) {
            conditions.push(eq(document.status, filters.status));
        }
        if (filters.search) {
            conditions.push(or(
                like(document.title, `%${filters.search}%`),
                like(document.displayId, `%${filters.search}%`),
                like(document.notes, `%${filters.search}%`)
            ));
        }

        // Get total count
        let countQuery = db.select({ count: sql`COUNT(*)::int` }).from(document);
        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }
        const [{ count: total }] = await countQuery;

        // Pagination
        const page = Math.max(1, parseInt(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
        const offset = (page - 1) * limit;

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
        ).limit(limit).offset(offset);
        
        return {
            data: docs.map(d => ({
                ...d.document,
                uploaderUser: { name: d.uploaderName }
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
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
     * Check if a user can approve a specific document (efficient single query)
     */
    async canUserApproveDocument(documentId, userId, role) {
        const pending = await db.select({ id: approval.id })
            .from(approval)
            .where(and(
                eq(approval.documentId, documentId),
                eq(approval.status, 'PENDING'),
                or(
                    eq(approval.assignedUserId, userId),
                    and(
                        isNull(approval.assignedUserId),
                        eq(approval.roleRequired, role)
                    )
                )
            ))
            .limit(1);
        return pending.length > 0;
    },

    /**
     * Delete document by ID (and cascade to approvals)
     */
    async deleteDocument(documentId) {
        return await db.transaction(async (tx) => {
            await tx.delete(approval).where(eq(approval.documentId, documentId));
            const deleted = await tx.delete(document).where(eq(document.id, documentId)).returning();
            return deleted.length > 0;
        });
    }
};
