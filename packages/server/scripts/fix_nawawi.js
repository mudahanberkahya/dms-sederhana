import 'dotenv/config';
import { db } from '../src/db/index.js';
import { user, userProfile } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function fix() {
    try {
        const userId = '29Dzy0w08JAN7H27QL0HA4QZd11FcCjh';

        // 1. Update role to admin
        await db.update(user)
            .set({ role: 'admin', emailVerified: true })
            .where(eq(user.id, userId));
        console.log("✅ Updated role to 'admin'");

        // 2. Create missing userProfile
        await db.insert(userProfile).values({
            userId: userId,
            branch: 'Astara Hotel'
        });
        console.log("✅ Created userProfile with branch 'Astara Hotel'");

        console.log("\n🎉 Nawawi is now a fully working Super Admin!");
        console.log("   Login: nawawi@astarahotel.com / password123\n");

        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}
fix();
