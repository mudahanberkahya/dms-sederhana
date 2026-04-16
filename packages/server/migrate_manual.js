import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const sqlScript = `
CREATE TABLE IF NOT EXISTS "department_ref" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "department" varchar(100);
ALTER TABLE "keyword_mapping" ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);
ALTER TABLE "user_profile" ADD COLUMN IF NOT EXISTS "department" varchar(100);
ALTER TABLE "workflow" ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);
`;

const run = async () => {
    const client = new Client({ connectionString: 'postgresql://postgres:p@55w0rd@localhost:5432/astara_dms' });
    await client.connect();
    try {
        await client.query(sqlScript);
        console.log("Migration applied successfully!");
    } catch(err) {
        console.error("Migration error:", err);
    } finally {
        await client.end();
    }
};

run();
