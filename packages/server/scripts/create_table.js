import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function createTable() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dms_db' });
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_template (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                fields_config JSON,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log("SUCCESS: document_template table verified/created.");
    } catch (err) {
        console.error("ERROR creating table:", err);
    } finally {
        await pool.end();
    }
}
createTable();
