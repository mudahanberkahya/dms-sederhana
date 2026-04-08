import 'dotenv/config';
import { db } from '../src/db/index.js';
import { user, account, userProfile } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
    try {
        const [u] = await db.select().from(user).where(eq(user.email, 'nawawi@astarahotel.com')).limit(1);
        if (!u) {
            console.log("User not found!");
            process.exit(1);
        }
        console.log("User:", JSON.stringify(u, null, 2));

        const [acc] = await db.select().from(account).where(eq(account.userId, u.id)).limit(1);
        console.log("Account:", JSON.stringify(acc, null, 2));

        const [prof] = await db.select().from(userProfile).where(eq(userProfile.userId, u.id)).limit(1);
        console.log("Profile:", JSON.stringify(prof, null, 2));

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
check();
