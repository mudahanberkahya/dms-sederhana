import 'dotenv/config';
import { db } from '../src/db/index.js';
import { user, account } from '../src/db/schema.js';
import { auth } from '../src/auth.js';
import { eq } from 'drizzle-orm';

async function resetPasswords() {
    try {
        console.log("Checking users...");
        const users = await db.select().from(user);

        for (const u of users) {
            console.log(`Resetting password for ${u.email}...`);

            // First delete old account credentials to avoid conflicts
            await db.delete(account).where(eq(account.userId, u.id));

            // Then use better-auth's server API to set a new password
            // Better auth has a method for this but it's easier to recreate the user credentials cleanly

            // Instead of fighting the internal hashing, let's use the signIn/signUp API if possible,
            // But since we just want to update the DB directly, let's look at Better Auth's password hash utility

            // We can use auth.api.signUpEmail on a dummy user to capture a correct hash format,
            // or just use the changePassword API

            // The easiest way is to use the auth.api.signUpEmail to recreate the user, 
            // but they already exist. Let's delete and recreate the accounts.
        }

    } catch (e) {
        console.error(e);
    }
}
resetPasswords();
