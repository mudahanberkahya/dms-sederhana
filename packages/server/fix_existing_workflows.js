
import 'dotenv/config';
import { db } from './src/db/index.js';
import { approval, document, workflow, workflowStep } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ApprovalService } from './src/services/approval.service.js';

async function fixExistingDocs() {
    console.log("--- HEALING DOCUMENT WORKFLOWS ---");

    // 1. Find all PENDING documents that might have wrong workflows
    const docs = await db.select().from(document).where(eq(document.status, 'PENDING'));

    for (const doc of docs) {
        console.log(`Checking Doc: ${doc.displayId} (${doc.category})`);

        // Get actual workflow for this category
        let wf = await db.select().from(workflow)
            .where(and(eq(workflow.category, doc.category), eq(workflow.branch, doc.branch)))
            .limit(1);
        
        if (wf.length === 0) {
            wf = await db.select().from(workflow)
                .where(and(eq(workflow.category, doc.category), eq(workflow.branch, 'All')))
                .limit(1);
        }

        if (wf.length > 0) {
            const expectedSteps = await db.select().from(workflowStep)
                .where(eq(workflowStep.workflowId, wf[0].id))
                .orderBy(workflowStep.stepOrder);
            
            const currentApprovals = await db.select().from(approval)
                .where(eq(approval.documentId, doc.id))
                .orderBy(approval.stepOrder);

            // Check if roles match
            const currentRoles = currentApprovals.map(a => a.roleRequired).join(',');
            const expectedRoles = expectedSteps.map(s => s.roleRequired).join(',');

            if (currentRoles !== expectedRoles) {
                console.log(`[FIX] Roles mismatch for ${doc.displayId}.`);
                console.log(`Current: ${currentRoles}`);
                console.log(`Expected: ${expectedRoles}`);

                // Check if any approval has been acted upon
                const acted = currentApprovals.some(a => a.status === 'APPROVED' || a.status === 'REJECTED');
                if (acted) {
                    console.log(`[SKIP] Document has already been partially acted upon. Manual fix required.`);
                    continue;
                }

                console.log(`[ACTION] Re-initializing approval chain for ${doc.displayId}...`);
                
                await db.transaction(async (tx) => {
                    // Delete old ones
                    await tx.delete(approval).where(eq(approval.documentId, doc.id));

                    // Insert new ones
                    const approvalsToInsert = expectedSteps.map((step, index) => ({
                        documentId: doc.id,
                        stepOrder: step.stepOrder,
                        roleRequired: step.roleRequired,
                        assignedUserId: null,
                        status: index === 0 ? 'PENDING' : 'LOCKED',
                    }));

                    const insertedApprovals = await tx.insert(approval).values(approvalsToInsert).returning();
                    
                    if (insertedApprovals.length > 0) {
                        const firstStep = insertedApprovals[0];
                        await ApprovalService.assignStepToUser(tx, firstStep.id, firstStep.roleRequired, doc.branch);
                    }
                });
                console.log(`[DONE] Fixed ${doc.displayId}`);
            } else {
                console.log(`[OK] Workflow matches for ${doc.displayId}`);
            }
        }
    }
}

fixExistingDocs().catch(console.error).then(() => process.exit(0));
