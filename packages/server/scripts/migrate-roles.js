import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { role, documentCategory } from '../src/db/schema.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function run() {
    try {
        console.log("Pushing DB changes...");
        // Drizzle push wrapper is a bit complex in a raw script without the CLI, let's just use raw SQL for the two simple tables to avoid CLI prompts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "role" (
                "id" text PRIMARY KEY NOT NULL,
                "name" varchar(100) NOT NULL,
                "created_at" timestamp DEFAULT now() NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS "document_category" (
                "id" varchar(50) PRIMARY KEY NOT NULL,
                "name" varchar(100) NOT NULL,
                "created_at" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Tables created.");

        console.log("Inserting default roles...");
        const rolesToInsert = [
            { id: 'initiator', name: 'Initiator' },
            { id: 'purchasing', name: 'Purchasing' },
            { id: 'cost_control', name: 'Cost Control' },
            { id: 'financial_controller', name: 'Financial Controller' },
            { id: 'hotel_manager', name: 'Hotel Manager' },
            { id: 'kic', name: 'KIC' },
            { id: 'admin', name: 'Administrator' }
        ];
        
        for (const r of rolesToInsert) {
             await pool.query('INSERT INTO "role" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [r.id, r.name]);
        }

        console.log("Inserting default categories...");
        const categoriesToInsert = [
            { id: 'Purchase Order', name: 'Purchase Order' },
            { id: 'Cash Advance', name: 'Cash Advance' },
            { id: 'Memo', name: 'Memo' },
            { id: 'Petty Cash', name: 'Petty Cash' }
        ];

        for (const c of categoriesToInsert) {
             await pool.query('INSERT INTO "document_category" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [c.id, c.name]);
        }

        console.log("✅ Migration complete.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await pool.end();
    }
}

run();
