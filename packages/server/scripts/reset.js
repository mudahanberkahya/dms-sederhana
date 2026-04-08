import "dotenv/config";
import { db } from "../src/db/index.js";
import { user, account } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

async function fix() {
   const users = await db.select().from(user);
   for (const u of users) {
      console.log("Resetting", u.email);
      await db.delete(account).where(eq(account.userId, u.id));

      const hashed = await hashPassword("password123");

      await db.insert(account).values({
         id: crypto.randomUUID(),
         accountId: u.id,
         providerId: "credential",
         userId: u.id,
         password: hashed,
         createdAt: new Date(),
         updatedAt: new Date()
      });
      console.log("Saved for", u.email);
   }
}

fix().then(() => {
   console.log("All users reset to password123");
   process.exit(0);
}).catch(console.error);
