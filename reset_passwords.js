import { db } from './packages/server/src/db/index.js';
import { user, account } from './packages/server/src/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

async function debugAndReset() {
    try {
        // 1. Find the user
        const [targetUser] = await db.select().from(user).where(eq(user.email, 'nawawi@astarahotel.com')).limit(1);
        if (!targetUser) {
            console.error("User nawawi@astarahotel.com not found in user table!");
            process.exit(1);
        }
        console.log("User found:", targetUser.id, targetUser.email);

        // 2. Find all accounts for this user
        const accounts = await db.select().from(account).where(eq(account.userId, targetUser.id));
        console.log(`Found ${accounts.length} account(s) for this user:`);
        for (const acc of accounts) {
            console.log(`  - id=${acc.id}, providerId=${acc.providerId}, hasPassword=${!!acc.password}`);
            if (acc.password) {
                console.log(`    Current hash (first 30 chars): ${acc.password.substring(0, 30)}...`);
                // Verify current password
                const isValid = await verifyPassword({ hash: acc.password, password: 'password123' });
                console.log(`    Verify 'password123' against current hash: ${isValid}`);
            }
        }

        // 3. Generate new hash and update
        const newHash = await hashPassword('password123');
        console.log(`\nNew hash (first 30 chars): ${newHash.substring(0, 30)}...`);

        // Verify the new hash works
        const newHashValid = await verifyPassword({ hash: newHash, password: 'password123' });
        console.log(`Verify new hash: ${newHashValid}`);

        // Update ALL credential accounts for this user
        const result = await db.update(account)
            .set({ password: newHash })
            .where(eq(account.userId, targetUser.id))
            .returning();
        
        console.log(`\nUpdated ${result.length} account(s)`);

        // 4. Verify after update
        const [updatedAcc] = await db.select().from(account).where(eq(account.userId, targetUser.id)).limit(1);
        const finalCheck = await verifyPassword({ hash: updatedAcc.password, password: 'password123' });
        console.log(`Final verify after DB update: ${finalCheck}`);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

debugAndReset();
