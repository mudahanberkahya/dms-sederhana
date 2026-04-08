import 'dotenv/config';
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS department varchar(100);`);
    console.log('Added department to user_profile');
    
    await db.execute(sql`ALTER TABLE document ADD COLUMN IF NOT EXISTS department varchar(100);`);
    console.log('Added department to document');
    
  } catch(e) {
    console.error('Migration error:', e);
  }
  process.exit(0);
}

migrate();
