import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:p@55w0rd@localhost:5432/astara_dms'
});

async function migrate() {
  const query1 = `ALTER TABLE "document_template" ADD COLUMN IF NOT EXISTS "html_content" text;`;
  const query2 = `ALTER TABLE "document_template" ADD COLUMN IF NOT EXISTS "orientation" varchar(20) DEFAULT 'portrait';`;
  const query3 = `ALTER TABLE "document_template" ALTER COLUMN "file_path" DROP NOT NULL;`;

  try {
    await pool.query(query1);
    await pool.query(query2);
    await pool.query(query3);
    console.log("Document Template columns added successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
