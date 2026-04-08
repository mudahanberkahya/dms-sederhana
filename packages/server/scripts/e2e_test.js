import 'dotenv/config';
import { db } from '../src/db/index.js';
import { document, user, approval, workflowStep } from '../src/db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { ApprovalService } from '../src/services/approval.service.js';

async function getFirstUserByRole(role) {
    const users = await db.select().from(user).where(eq(user.role, role)).limit(1);
    if (users.length === 0) throw new Error(`No user found with role ${role}`);
    return users[0];
}

async function runTest() {
    console.log("Starting E2E Workflow Service Test...");

    const docs = await db.select().from(document).orderBy(asc(document.createdAt));
    if (docs.length < 4) {
        console.error("Less than 4 documents found in the database. Found:", docs.length);
        process.exit(1);
    }

    const doc1 = docs[0];
    const doc2 = docs[1];
    const doc3 = docs[2];
    const doc4 = docs[3];

    console.log(`\n======================================`);
    console.log(`Document 1 (Target: COMPLETE): ${doc1.id}`);
    console.log(`======================================`);

    // Check if doc 1 is pending/rejected, reset to pending for test if needed
    if (doc1.status !== 'PENDING') {
        await db.update(document).set({ status: 'PENDING' }).where(eq(document.id, doc1.id));
        const apps = await db.select().from(approval).where(eq(approval.documentId, doc1.id)).orderBy(asc(approval.stepOrder));
        for (let i = 0; i < apps.length; i++) {
            await db.update(approval).set({ status: i === 0 ? 'PENDING' : 'LOCKED' }).where(eq(approval.id, apps[i].id));
        }
    }

    let doc1Approvals = await db.select().from(approval).where(eq(approval.documentId, doc1.id)).orderBy(asc(approval.stepOrder));

    for (const step of doc1Approvals) {
        let assignedUserEmail = null;
        let assignedUserId = null;
        if (step.assignedUserId) {
            const u = await db.select().from(user).where(eq(user.id, step.assignedUserId)).limit(1);
            assignedUserEmail = u[0].email;
            assignedUserId = u[0].id;
        } else {
            const u = await getFirstUserByRole(step.roleRequired);
            assignedUserEmail = u.email;
            assignedUserId = u.id;
        }

        try {
            console.log(`[ACTION] Approving step ${step.stepOrder} as ${assignedUserEmail}...`);
            await ApprovalService.processApproval(step.id, assignedUserId, 'approve', `Service layer approval by ${assignedUserEmail}`);
            console.log(` -> Step ${step.stepOrder} approved successfully.`);
        } catch (e) {
            console.error(` -> Failed to approve step ${step.stepOrder}:`, e.message);
        }
    }

    console.log(`\n======================================`);
    console.log(`Document 2 (Target: PENDING): ${doc2.id}`);
    console.log(`======================================`);

    let doc2Approvals = await db.select().from(approval).where(eq(approval.documentId, doc2.id)).orderBy(asc(approval.stepOrder));
    if (doc2Approvals.length > 0) {
        const firstStep = doc2Approvals[0];
        let assignedUserEmail = null;
        let assignedUserId = null;
        if (firstStep.assignedUserId) {
            const u = await db.select().from(user).where(eq(user.id, firstStep.assignedUserId)).limit(1);
            assignedUserEmail = u[0].email;
            assignedUserId = u[0].id;
        } else {
            const u = await getFirstUserByRole(firstStep.roleRequired);
            assignedUserEmail = u.email;
            assignedUserId = u.id;
        }
        try {
            console.log(` -> Acting as ${assignedUserEmail} for Doc 2 first step, leaving it PENDING.`);
            const pending = await ApprovalService.getPendingApprovals(assignedUserId, firstStep.roleRequired);
            const found = pending.some(p => p.id === firstStep.id);
            console.log(` -> Verified doc 2 is in pending queue: ${found}`);
        } catch (e) {
            console.error(` -> Failed to check pending queue:`, e.message);
        }
    }

    console.log(`\n======================================`);
    console.log(`Document 3 (Target: REJECTED): ${doc3.id}`);
    console.log(`======================================`);

    if (doc3.status !== 'PENDING') {
        await db.update(document).set({ status: 'PENDING' }).where(eq(document.id, doc3.id));
        const apps = await db.select().from(approval).where(eq(approval.documentId, doc3.id)).orderBy(asc(approval.stepOrder));
        for (let i = 0; i < apps.length; i++) {
            await db.update(approval).set({ status: i === 0 ? 'PENDING' : 'LOCKED' }).where(eq(approval.id, apps[i].id));
        }
    }

    let doc3Approvals = await db.select().from(approval).where(eq(approval.documentId, doc3.id)).orderBy(asc(approval.stepOrder));
    if (doc3Approvals.length > 0) {
        const firstStep = doc3Approvals[0];
        let assignedUserEmail = null;
        let assignedUserId = null;
        if (firstStep.assignedUserId) {
            const u = await db.select().from(user).where(eq(user.id, firstStep.assignedUserId)).limit(1);
            assignedUserEmail = u[0].email;
            assignedUserId = u[0].id;
        } else {
            const u = await getFirstUserByRole(firstStep.roleRequired);
            assignedUserEmail = u.email;
            assignedUserId = u.id;
        }
        try {
            console.log(`[ACTION] Rejecting step ${firstStep.stepOrder} as ${assignedUserEmail}...`);
            await ApprovalService.processApproval(firstStep.id, assignedUserId, 'reject', `Rejected by service test as ${assignedUserEmail}`);
            console.log(` -> Step ${firstStep.stepOrder} rejected successfully.`);
        } catch (e) {
            console.error(` -> Failed to reject step ${firstStep.stepOrder}:`, e.message);
        }
    }

    console.log(`\n======================================`);
    console.log(`Document 4 (Spare/Observation): ${doc4.id}`);
    console.log(`======================================`);
    console.log(` -> Observing document 4 in DB state without interaction.`);

    console.log(`\n======================================`);
    console.log(`FINAL RESULTS`);
    console.log(`======================================`);

    await new Promise(res => setTimeout(res, 1000));

    const finalDocs = await db.select().from(document).orderBy(asc(document.createdAt));
    for (let i = 0; i < 4; i++) {
        console.log(`Document ${i + 1} Status: ${finalDocs[i].status} (ID: ${finalDocs[i].id})`);
    }

    process.exit(0);
}

runTest().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
