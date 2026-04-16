import 'dotenv/config';
import { db } from './src/db/index.js';
import { account } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

async function run() {
    try {
        const userId = 'b80befe2-32cd-49e5-9fa1-fc1f37d09526'; // Admin
        const newPassword = 'NewSecretPassword!';
        const hashedPassword = await hashPassword(newPassword);

        const result = await db.update(account)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
            .returning();
            
        console.log("Updated rows:", result);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
