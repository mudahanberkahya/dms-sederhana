import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    trustedOrigins: [
        "http://localhost:3001",
        "http://localhost:5174",
        "http://127.0.0.1:3001",
        "http://192.168.0.100:5174",
        process.env.BETTER_AUTH_URL || "http://192.168.0.100:3001",
        // TestSprite automated testing tunnel origins
        "http://*.testsprite.com",
        "https://*.testsprite.com",
        "http://*.testsprite.com:8080",
    ],
    plugins: [
        admin() // Enables role field
    ]
});
