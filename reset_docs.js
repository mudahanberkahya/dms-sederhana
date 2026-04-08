import { db } from './packages/server/src/db/index.js';
import { document, approval, user, workflow, workflowStep } from './packages/server/src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function resetTestData() {
    try {
        console.log("=== Resetting test data for approval tests ===");
        
        // 1. Reset ALL documents to PENDING
        await db.update(document).set({ 
            status: 'PENDING', 
            signedFilePath: null,
            updatedAt: new Date()
        });
        console.log("✅ All documents reset to PENDING");

        // 2. For each document, reset its approval chain:
        //    - First step → PENDING, clear action fields
        //    - All other steps → LOCKED, clear action fields
        const allDocs = await db.select().from(document);
        
        for (const doc of allDocs) {
            const steps = await db.select().from(approval)
                .where(eq(approval.documentId, doc.id))
                .orderBy(approval.stepOrder);
            
            for (let i = 0; i < steps.length; i++) {
                await db.update(approval)
                    .set({ 
                        status: i === 0 ? 'PENDING' : 'LOCKED',
                        actedByUserId: null, 
                        comment: null, 
                        signedAt: null,
                        updatedAt: new Date()
                    })
                    .where(eq(approval.id, steps[i].id));
            }
        }
        console.log("✅ All approval steps reset (first=PENDING, rest=LOCKED)");

        // 3. Ensure at least 2 PENDING documents exist for concurrent tests
        const docCount = allDocs.length;
        console.log(`   Found ${docCount} documents in DB`);

        if (docCount < 2) {
            console.log("⚠️  Less than 2 documents. Creating additional test document...");
            
            // Find the admin user for uploadedBy
            const [adminUser] = await db.select().from(user).where(eq(user.role, 'admin')).limit(1);
            if (!adminUser) {
                console.error("❌ No admin user found, cannot create test document");
                process.exit(1);
            }

            const year = new Date().getFullYear();
            const randomSeq = Math.floor(1000 + Math.random() * 9000);
            const displayId = `PO-${year}-${randomSeq}`;

            // Find the first document's category/branch to match workflow
            const refDoc = allDocs[0];
            const category = refDoc ? refDoc.category : 'Purchase Order';
            const branch = refDoc ? refDoc.branch : 'Astara Hotel';

            const [newDoc] = await db.insert(document).values({
                displayId,
                title: `Test Document for Approval #${randomSeq}`,
                category,
                branch,
                notes: 'Auto-generated test document for approval testing',
                filePath: refDoc ? refDoc.filePath : 'storage/documents/test.pdf',
                uploadedBy: adminUser.id,
                status: 'PENDING'
            }).returning();

            console.log(`   Created new document: ${displayId} (${newDoc.id})`);

            // Create approval chain for the new document based on existing workflow
            let wf = await db.select().from(workflow)
                .where(eq(workflow.category, category));
            
            if (wf.length > 0) {
                const steps = await db.select().from(workflowStep)
                    .where(eq(workflowStep.workflowId, wf[0].id))
                    .orderBy(workflowStep.stepOrder);
                
                if (steps.length > 0) {
                    const approvalsToInsert = steps.map((step, index) => ({
                        documentId: newDoc.id,
                        stepOrder: step.stepOrder,
                        roleRequired: step.roleRequired,
                        assignedUserId: null,
                        status: index === 0 ? 'PENDING' : 'LOCKED',
                    }));
                    await db.insert(approval).values(approvalsToInsert);
                    console.log(`   Created ${steps.length} approval steps for new document`);
                }
            }
        }

        console.log("\n=== Database reset complete ===");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error resetting DB:", err);
        process.exit(1);
    }
}

resetTestData();
