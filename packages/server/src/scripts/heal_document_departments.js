import 'dotenv/config';
import { db } from '../db/index.js';
import { document, userProfile } from '../db/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';

async function healDocumentDepartments() {
    console.log("Starting Document Department Backfill...");

    try {
        // 1. Fetch all documents where department is null or empty
        const docsWithoutDept = await db.select({
            id: document.id,
            displayId: document.displayId,
            uploadedBy: document.uploadedBy
        })
        .from(document)
        .where(
            sql`${document.department} IS NULL OR ${document.department} = ''`
        );

        console.log(`Found ${docsWithoutDept.length} documents missing department assignment.`);

        // 2. Fetch all user profiles to map their departments
        const profiles = await db.select({
            userId: userProfile.userId,
            department: userProfile.department
        }).from(userProfile);

        const profileMap = {};
        profiles.forEach(p => {
            profileMap[p.userId] = p.department || 'GENERAL';
        });

        // 3. Update documents
        let updatedCount = 0;
        for (const doc of docsWithoutDept) {
            const mappedDept = profileMap[doc.uploadedBy] || 'GENERAL';
            
            await db.update(document)
                .set({ department: mappedDept })
                .where(eq(document.id, doc.id));
            
            updatedCount++;
            
            if (updatedCount % 20 === 0) {
                console.log(`Progress: ${updatedCount} / ${docsWithoutDept.length} documents updated...`);
            }
        }

        console.log(`\n================================`);
        console.log(`✅ Healing Complete!`);
        console.log(`Successfully backfilled department for ${updatedCount} legacy documents.`);
        console.log(`================================\n`);

    } catch (err) {
        console.error("Fatal exception during script execution:", err);
    } finally {
        process.exit(0);
    }
}

healDocumentDepartments();
