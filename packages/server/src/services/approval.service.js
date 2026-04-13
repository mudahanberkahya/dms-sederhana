import { eq, and, or, isNull, arrayContains, inArray, sql, gte, lte } from 'drizzle-orm';
import path from 'path';
import { db } from '../db/index.js';
import { approval, document, user, userProfile, signature, keywordMapping } from '../db/schema.js';
import { PdfService } from './pdf.service.js';

export const ApprovalService = {

    /**
     * Get pending approvals for a specific user.
     * Checks explicitly assigned tasks (including delegations) OR unassigned tasks matching role.
     * @param {string} userId
     * @param {string} role
     * @param {Object} filters - Optional: { startDate, endDate }
     */
    async getPendingApprovals(userId, role, filters = {}) {
        // Fetch current user's profile branches and department to filter pooled unassigned tasks
        const [currentUserProfile] = await db.select({ 
            branches: userProfile.branches,
            department: userProfile.department,
            role: user.role
        })
            .from(userProfile)
            .innerJoin(user, eq(userProfile.userId, user.id))
            .where(eq(userProfile.userId, userId))
            .limit(1);
        
        const userBranches = currentUserProfile?.branches || [];
        const userDepartment = currentUserProfile?.department || null;
        const isAdmin = currentUserProfile?.role === 'admin';

        // Find if this user is a delegate for anyone who is absent
        const delegatedUserRes = await db.select({ id: userProfile.userId })
            .from(userProfile)
            .where(
                and(
                    eq(userProfile.delegatedToUserId, userId),
                    eq(userProfile.isAbsent, true)
                )
            );
        const absentUserIdsForWhichIAmDelegate = delegatedUserRes.map(r => r.id);

        const conditions = [
            eq(approval.status, 'PENDING'),
            or(
                // 1. Explicitly assigned to me
                eq(approval.assignedUserId, userId),
                // 2. Explicitly assigned to someone I am a delegate for
                absentUserIdsForWhichIAmDelegate.length > 0
                    ? inArray(approval.assignedUserId, absentUserIdsForWhichIAmDelegate)
                    : sql`false`,
                // 3. Pooled: unassigned, matches my role, matches my branches (or I am admin), AND if HOD, matches my department
                and(
                    isNull(approval.assignedUserId),
                    eq(approval.roleRequired, role),
                    isAdmin ? sql`true` : (userBranches.length > 0 ? inArray(document.branch, userBranches) : sql`false`),
                    role.toLowerCase() === 'hod' && userDepartment ? sql`COALESCE(${approval.targetDepartment}, ${document.department}) = ${userDepartment}` : sql`true`
                )
            )
        ];

        if (filters.branch && filters.branch !== 'All') {
            conditions.push(eq(document.branch, filters.branch));
        }

        if (filters.startDate) {
            conditions.push(gte(approval.createdAt, new Date(filters.startDate)));
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            conditions.push(lte(approval.createdAt, endOfDay));
        }

        return await db.select({
            approvalId: approval.id,
            documentId: document.id,
            displayId: document.displayId,
            title: document.title,
            category: document.category,
            branch: document.branch,
            status: approval.status,
            assignedUserId: approval.assignedUserId,
            delegatedFromUserId: approval.delegatedFromUserId,
            createdAt: approval.createdAt
        })
            .from(approval)
            .innerJoin(document, eq(approval.documentId, document.id))
            .where(and(...conditions));
    },

    /**
     * Helper: Assigns a pending approval step to a specific user based on Role + Branch.
     * Checks if the found user is marked absent, and if so, routes to their delegate.
     * If multiple users share the role and branch, the step is left unassigned (pooled).
     */
    async assignStepToUser(tx, approvalId, roleRequired, branch, department) {
        const conditions = [
            eq(user.role, roleRequired),
            arrayContains(userProfile.branches, [branch])
        ];
        
        // If it's a department-level role like HOD, we must match the exact department too
        if (roleRequired.toLowerCase() === 'hod' && department) {
            conditions.push(eq(userProfile.department, department));
        }

        const targetUsers = await tx.select({
            id: user.id,
            isAbsent: userProfile.isAbsent,
            delegatedToUserId: userProfile.delegatedToUserId
        })
            .from(user)
            .innerJoin(userProfile, eq(user.id, userProfile.userId))
            .where(and(...conditions));

        if (targetUsers.length === 1) {
            // Only one user available in this role/branch combination
            const targetUser = targetUsers[0];
            let assignedUserId = targetUser.id;
            let delegatedFromUserId = null;

            // Delegation check
            if (targetUser.isAbsent && targetUser.delegatedToUserId) {
                assignedUserId = targetUser.delegatedToUserId;
                delegatedFromUserId = targetUser.id;
            }

            await tx.update(approval)
                .set({
                    assignedUserId,
                    delegatedFromUserId
                })
                .where(eq(approval.id, approvalId));
        } else if (targetUsers.length > 1) {
            // Multiple users found: Pooled assignment
            // Clear any previous assignments so everyone in the pool can see it
            await tx.update(approval)
                .set({
                    assignedUserId: null,
                    delegatedFromUserId: null
                })
                .where(eq(approval.id, approvalId));
        }
    },

    /**
     * Process an approval action (Approve/Reject)
     */
    async processApproval(approvalId, userId, action, comment) {
        try {
            return await db.transaction(async (tx) => {
                // 1. Get current approval step
                const [currentStepList] = await tx.select()
                    .from(approval)
                    .innerJoin(document, eq(approval.documentId, document.id))
                    .where(eq(approval.id, approvalId))
                    .limit(1);

                if (!currentStepList) throw new Error("Approval step not found");
                const currentStep = currentStepList.approval;
                const documentRec = currentStepList.document;

                if (currentStep.status !== 'PENDING') throw new Error(`Approval step is not pending (status: ${currentStep.status})`);

                // BRANCH ISOLATION SECURITY CHECK
                const [currentUserProfile] = await tx.select({ 
                    branches: userProfile.branches,
                    role: user.role
                })
                    .from(userProfile)
                    .innerJoin(user, eq(userProfile.userId, user.id))
                    .where(eq(userProfile.userId, userId))
                    .limit(1);
                    
                const userBranches = currentUserProfile?.branches || [];
                const isAdmin = currentUserProfile?.role === 'admin';
                
                if (!isAdmin && documentRec.branch && !userBranches.includes(documentRec.branch)) {
                    throw new Error("403_FORBIDDEN"); // Route should catch this 403 keyword
                }

                // 2. Update the approval step
                const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

                await tx.update(approval)
                    .set({
                        status: newStatus,
                        actedByUserId: userId,
                        comment: comment,
                        signedAt: action === 'approve' ? new Date() : null,
                        updatedAt: new Date()
                    })
                    .where(eq(approval.id, approvalId));

                // 3. Process the next steps and get doc info
                const docId = currentStep.documentId;
                const [doc] = await tx.select().from(document).where(eq(document.id, docId)).limit(1);
                if (!doc) throw new Error("Document not found");

                const fs = await import('fs');

                if (action === 'reject') {
                    // Move file to rejected folder
                    const storageRoot = process.env.DOCUMENT_STORAGE_PATH || path.resolve(process.cwd(), './storage/documents');
                    const safeBranch = doc.branch ? doc.branch.replace(/[^a-zA-Z0-9-]/g, '_') : 'Uncategorized';
                    const rejectedDir = path.join(storageRoot, 'rejected', safeBranch);
                    if (!fs.existsSync(rejectedDir)) fs.mkdirSync(rejectedDir, { recursive: true });

                    const currentFile = doc.signedFilePath || doc.filePath;
                    const newFileName = path.basename(currentFile);
                    const newFilePath = path.join(rejectedDir, newFileName);

                    let absoluteCurrentFile = currentFile;
                    if (!path.isAbsolute(absoluteCurrentFile)) absoluteCurrentFile = path.resolve(process.cwd(), currentFile);

                    try {
                        if (fs.existsSync(absoluteCurrentFile)) {
                            await fs.promises.rename(absoluteCurrentFile, newFilePath);
                        }
                    } catch (err) {
                        console.error("[Approval] File move to rejected failed:", err);
                        throw new Error("Failed to move file to rejected folder");
                    }

                    // Update document
                    await tx.update(document)
                        .set({ 
                            status: 'REJECTED', 
                            updatedAt: new Date(),
                            filePath: doc.signedFilePath ? doc.filePath : newFilePath, // keep original filePath as is if signed exists, else update
                            signedFilePath: doc.signedFilePath ? newFilePath : null
                        })
                        .where(eq(document.id, docId));

                } else if (action === 'approve') {
                    // Try to generate a stamp
                    let stampedFilePath = null;
                    const [sig] = await tx.select().from(signature).where(eq(signature.userId, userId)).limit(1);
                    if (sig) {
                        // REFINED: Strictly filter keyword mapping by category, role, branch AND sub_category
                        let kwResults = [];
                        
                        // First: try exact match with sub_category
                        if (doc.subCategory) {
                            kwResults = await tx.select().from(keywordMapping)
                                .where(
                                    and(
                                        eq(keywordMapping.category, doc.category),
                                        eq(keywordMapping.role, currentStep.roleRequired),
                                        eq(keywordMapping.subCategory, doc.subCategory),
                                        or(
                                            eq(keywordMapping.stepOrder, currentStep.stepOrder),
                                            isNull(keywordMapping.stepOrder)
                                        ),
                                        or(
                                            eq(keywordMapping.branch, doc.branch),
                                            eq(keywordMapping.branch, 'All')
                                        )
                                    )
                                );
                        }
                        
                        // Fallback: keyword mappings without sub_category
                        if (kwResults.length === 0) {
                            kwResults = await tx.select().from(keywordMapping)
                                .where(
                                    and(
                                        eq(keywordMapping.category, doc.category),
                                        eq(keywordMapping.role, currentStep.roleRequired),
                                        or(
                                            eq(keywordMapping.stepOrder, currentStep.stepOrder),
                                            isNull(keywordMapping.stepOrder)
                                        ),
                                        or(
                                            eq(keywordMapping.branch, doc.branch),
                                            eq(keywordMapping.branch, 'All')
                                        )
                                    )
                                );
                            // Further filter: prefer null sub_category fallback
                            const nullSubCat = kwResults.filter(k => !k.subCategory);
                            if (nullSubCat.length > 0) {
                                kwResults = nullSubCat;
                            }
                        }
                            
                        // Prioritize exact stepOrder match, then exact branch match, else fallback to 'All'
                        const exactStepResults = kwResults.filter(k => k.stepOrder === currentStep.stepOrder);
                        const candidates = exactStepResults.length > 0 ? exactStepResults : kwResults;
                        const kw = candidates.find(k => k.branch === doc.branch) || candidates.find(k => k.branch === 'All');

                        if (kw) {
                            const trimmedKeyword = kw.keyword.trim();
                            const inputPath = doc.signedFilePath || doc.filePath;
                            const storageDir = path.dirname(inputPath);
                            const cleanDisplayId = doc.displayId.replace(/[^a-zA-Z0-9-]/g, '_');
                            
                            // Extract original name to build new name
                            let originalName = cleanDisplayId;
                            const baseMatch = path.basename(doc.filePath).match(/^(.*?)_/);
                            if (baseMatch) {
                                originalName = baseMatch[1];
                            }
                            
                            const outputPath = path.join(storageDir, `${originalName}_${cleanDisplayId}_step${currentStep.stepOrder}_signed.pdf`);

                            console.log(`[Approval] Executing PDF stamp: "${trimmedKeyword}" (Category: ${doc.category}, Role: ${currentStep.roleRequired}) -> ${outputPath}`);
                            
                            await PdfService.stampSignature(
                                inputPath,
                                outputPath,
                                sig.imagePath,
                                trimmedKeyword,
                                kw.positionHint,
                                kw.offset_x,
                                kw.offset_y
                            );
                            stampedFilePath = outputPath;

                            // Clean up previous signed file if needed
                            if (doc.signedFilePath && doc.signedFilePath !== doc.filePath) {
                                try {
                                    const oldAbs = path.isAbsolute(doc.signedFilePath) ? doc.signedFilePath : path.resolve(process.cwd(), doc.signedFilePath);
                                    if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
                                } catch (e) {
                                    console.warn("[Approval] Failed to cleanup old signed file:", e.message);
                                }
                            }
                        } else {
                            console.error(`[Approval] CRITICAL: No keyword mapping found for Category="${doc.category}" and Role="${currentStep.roleRequired}"`);
                            throw new Error(`Sistem tidak menemukan konfigurasi posisi tanda tangan (Keyword) untuk kategori "${doc.category}" dengan peran "${currentStep.roleRequired}". Mohon hubungi Administrator.`);
                        }
                    } else {
                        console.warn(`[Approval] No signature found for user ${userId}`);
                        // Optional: you might want to throw error here too if signature is mandatory for approval step
                    }

                    // Update DB with stamp if occurred
                    const currentSignedPath = stampedFilePath || doc.signedFilePath;

                    const allSteps = await tx.select().from(approval)
                        .where(eq(approval.documentId, docId))
                        .orderBy(approval.stepOrder);

                    const currentIndex = allSteps.findIndex(s => s.id === approvalId);

                    if (currentIndex < allSteps.length - 1) {
                        // Unlock the next step
                        const nextStep = allSteps[currentIndex + 1];
                        await tx.update(approval)
                            .set({ status: 'PENDING', updatedAt: new Date() })
                            .where(eq(approval.id, nextStep.id));

                        await ApprovalService.assignStepToUser(tx, nextStep.id, nextStep.roleRequired, doc.branch);

                        if (currentSignedPath) {
                            await tx.update(document)
                                .set({ signedFilePath: currentSignedPath })
                                .where(eq(document.id, docId));
                        }
                    } else {
                        // This was the last step, mark document as fully approved and build NAS folders
                        const storageRoot = process.env.DOCUMENT_STORAGE_PATH || path.resolve(process.cwd(), './storage/documents');
                        const safeBranch = doc.branch ? doc.branch.replace(/[^a-zA-Z0-9-]/g, '_') : 'Uncategorized';
                        
                        // Storage paths based on PRD requirements
                        const approvedDir = path.join(storageRoot, 'approved', safeBranch);
                        const originalsDir = path.join(storageRoot, 'originals', safeBranch);
                        if (!fs.existsSync(approvedDir)) fs.mkdirSync(approvedDir, { recursive: true });
                        if (!fs.existsSync(originalsDir)) fs.mkdirSync(originalsDir, { recursive: true });

                        const fileToMove = currentSignedPath || doc.filePath;
                        
                        // Extract base name for clean file naming
                        let originalName = doc.displayId.replace(/[^a-zA-Z0-9-]/g, '_');
                        const baseMatch = path.basename(doc.filePath).match(/^(.*?)_/);
                        if (baseMatch) {
                            originalName = baseMatch[1];
                        }
                        
                        // Final File Settings
                        const signedSuffix = currentSignedPath ? '_signed.pdf' : '.pdf';
                        const newSignedFileName = `${originalName}_${doc.displayId}${signedSuffix}`;
                        const newSignedFilePath = path.join(approvedDir, newSignedFileName);

                        const originalFileName = `${originalName}_${doc.displayId}_original.pdf`;
                        const newOriginalFilePath = path.join(originalsDir, originalFileName);

                        // Absolutes
                        let absoluteCurrentSigned = fileToMove;
                        if (!path.isAbsolute(absoluteCurrentSigned)) absoluteCurrentSigned = path.resolve(process.cwd(), fileToMove);

                        let absoluteOriginalUnsigned = doc.filePath;
                        if (!path.isAbsolute(absoluteOriginalUnsigned)) absoluteOriginalUnsigned = path.resolve(process.cwd(), doc.filePath);

                        try {
                            // 1. Move the final signed document into `/approved/`
                            if (fs.existsSync(absoluteCurrentSigned)) {
                                await fs.promises.rename(absoluteCurrentSigned, newSignedFilePath);
                            }
                            
                            // 2. Move the original untouched document into `/originals/`
                            if (currentSignedPath && absoluteOriginalUnsigned !== absoluteCurrentSigned && fs.existsSync(absoluteOriginalUnsigned)) {
                                await fs.promises.rename(absoluteOriginalUnsigned, newOriginalFilePath);
                            } else if (!currentSignedPath && fs.existsSync(newSignedFilePath)) {
                                // If it was auto-approved without signatures, copy the sole file to originals
                                await fs.promises.copyFile(newSignedFilePath, newOriginalFilePath);
                            }
                        } catch (err) {
                            console.error("[Approval] File move to NAS folders failed:", err);
                            throw new Error("Failed to move file to approved/originals NAS folder");
                        }

                        await tx.update(document)
                            .set({ 
                                status: 'APPROVED', 
                                updatedAt: new Date(),
                                signedFilePath: currentSignedPath ? newSignedFilePath : null,
                                filePath: newOriginalFilePath
                            })
                            .where(eq(document.id, docId));
                    }
                }

                return { success: true, newStatus };
            });
        } catch (err) {
            console.error("processApproval Transaction Error:", err);
            // This throw will be caught by the route handler and returned as 500 error
            throw err;
        }
    }
};
