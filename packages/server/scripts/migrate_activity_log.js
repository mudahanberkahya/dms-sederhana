import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:p@55w0rd@localhost:5432/astara_dms'
});

async function migrate() {
  const query = `
    CREATE TABLE IF NOT EXISTS "activity_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text,
        "action" varchar(100) NOT NULL,
        "entity" varchar(50) NOT NULL,
        "entity_id" text,
        "details" text NOT NULL,
        "metadata" text,
        "created_at" timestamp DEFAULT now() NOT NULL
    );
    
    -- Attempt to add foreign key, ignore if fails/exists
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_user_id_fk') THEN
            ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
        END IF;
    END $$;
  `;
  try {
    await pool.query(query);
    console.log("Activity log table created successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrate();
