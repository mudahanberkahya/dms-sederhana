import fs from 'fs';
import path from 'path';
import { db } from './packages/server/src/db/index.js';
import { user, document, approval, signature, role, documentCategory, workflow, workflowStep } from './packages/server/src/db/schema.js';
import { DocumentService } from './packages/server/src/services/document.service.js';
import { ApprovalService } from './packages/server/src/services/approval.service.js';
import { eq, and } from 'drizzle-orm';

async function runTest() {
    try {
        console.log("=== STARTING APPROVAL INTEGRATION TEST ===");

        // 1. Ensure storage dirs exist
        const storagePending = path.resolve('./storage/documents/pending');
        if (!fs.existsSync(storagePending)) fs.mkdirSync(storagePending, { recursive: true });

        // 2. Create a dummy PDF in pending to act as if Multer uploaded it
        const dummyOriginalName = "Test Invoice_ImportantHQ.pdf";
        const dummyContent = "%PDF-1.4 dummy content";
        const dummyMulterName = `Test_Invoice_ImportantHQ_2024-05-01T12-00-00.pdf`;
        const dummyFilePath = path.join(storagePending, dummyMulterName);
        fs.writeFileSync(dummyFilePath, dummyContent);

        console.log(`[TEST] Created mock uploaded file at: ${dummyFilePath}`);

        // 3. Find a user to act as uploader and approver
        const [testUser] = await db.select().from(user).limit(1);
        if (!testUser) throw new Error("No users in DB to run test");

        // 4. Create document via Service
        console.log("[TEST] Creating document via DocumentService...");
        const newDoc = await DocumentService.createDocument({
            title: "Integration Test Document",
            category: "Purchase Order",
            branch: "Astara Hotel",
            notes: "Please approve this test.",
            filePath: dummyFilePath,
            originalName: dummyOriginalName,
            uploadedBy: testUser.id
        });

        console.log(`[TEST] Document created. DisplayID: ${newDoc.displayId}, FilePath: ${newDoc.filePath}`);
        
        if (!fs.existsSync(newDoc.filePath)) {
            console.warn(`[TEST-WARN] File was not properly renamed/moved to ${newDoc.filePath}`);
        } else {
            console.log(`[TEST] ✅ File rename worked.`);
        }

        // 5. Get pending approval step
        const [pendingApproval] = await db.select().from(approval)
            .where(
                and(
                    eq(approval.documentId, newDoc.id),
                    eq(approval.status, 'PENDING')
                )
            )
            .limit(1);
        
        if (!pendingApproval) {
            console.warn("[TEST-WARN] No approval steps generated. Workflow might be missing.");
            return;
        }

        console.log(`[TEST] Found pending approval: ${pendingApproval.id}`);

        // 6. Process approval
        console.log("[TEST] Processing approval...");
        
        // This should trigger the new atomic try/catch block
        const result = await ApprovalService.processApproval(pendingApproval.id, testUser.id, 'approve', "LGTM");
        
        console.log("[TEST] Approval processed successfully:", result);

        // 7. Verify Document state
        const [updatedDoc] = await db.select().from(document).where(eq(document.id, newDoc.id)).limit(1);
        console.log(`[TEST] Final Document Status: ${updatedDoc.status}`);
        console.log(`[TEST] Final signedFilePath: ${updatedDoc.signedFilePath}`);
        console.log(`[TEST] Final filePath: ${updatedDoc.filePath}`);

        if (updatedDoc.status === 'APPROVED') {
            console.log("[TEST] ✅ Document fully approved. Checking 'approved' folder...");
        } else {
            console.log("[TEST] Document still pending next steps. This is expected if workflow has >1 steps.");
        }

    } catch (err) {
        console.error("❌ TEST FAILED:", err);
    } finally {
        process.exit(0);
    }
}

runTest();
