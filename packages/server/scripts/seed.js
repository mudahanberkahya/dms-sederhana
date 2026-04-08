import 'dotenv/config';
import crypto from 'crypto';
import { db } from '../src/db/index.js';
import { user, account, userProfile } from '../src/db/schema.js';
import { hashPassword } from 'better-auth/crypto';

async function seed() {
    try {
        console.log("🔧 Creating Super Admin 'Nawawi'...\n");

        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();
        const now = new Date();
        const hashedPassword = await hashPassword('password123');

        // 1. Insert into Better Auth `user` table
        await db.insert(user).values({
            id: userId,
            name: 'Nawawi',
            email: 'nawawi@astarahotel.com',
            emailVerified: true,
            role: 'admin',
            banned: false,
            createdAt: now,
            updatedAt: now
        });

        // 2. Insert into Better Auth `account` table (credential provider)
        await db.insert(account).values({
            id: accountId,
            accountId: userId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now
        });

        // 3. Insert DMS-specific profile
        await db.insert(userProfile).values({
            userId: userId,
            branch: 'Astara Hotel'
        });

        console.log("✅ Super Admin created successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("   Email:    nawawi@astarahotel.com");
        console.log("   Password: password123");
        console.log("   Role:     admin");
        console.log("   Branch:   Astara Hotel");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        process.exit(0);
    } catch (err) {
        if (err.message && err.message.includes('duplicate key')) {
            console.log("⚠️  User 'nawawi@astarahotel.com' already exists. Skipping.");
            process.exit(0);
        }
        console.error("❌ Error seeding user:", err);
        process.exit(1);
    }
}

seed();
