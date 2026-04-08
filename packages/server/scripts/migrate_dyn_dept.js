import 'dotenv/config';
import { db } from '../src/db/index.js';
import { departmentRef } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';

async function run() {
    console.log('Starting dynamic department migration...');
    try {
        console.log('Creating department_ref table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS department_ref (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `);
        console.log('Table created or already exists.');

        console.log('Seeding default departments if empty...');
        
        const existing = await db.select().from(departmentRef);
        if (existing.length === 0) {
            const defaults = [
                { id: 'GENERAL', name: 'General' },
                { id: 'FO', name: 'Front Office (FO)' },
                { id: 'HK', name: 'Housekeeping (HK)' },
                { id: 'FB', name: 'Food & Beverage (FB)' },
                { id: 'ENG', name: 'Engineering (ENG)' },
                { id: 'HR', name: 'Human Resources (HR)' },
                { id: 'ACCT', name: 'Accounting (ACCT)' },
                { id: 'SALES', name: 'Sales & Marketing' },
                { id: 'IT', name: 'IT' },
                { id: 'PURCHASING', name: 'Purchasing' }
            ];
            
            await db.insert(departmentRef).values(defaults);
            console.log(`Seeded ${defaults.length} default departments.`);
        } else {
            console.log(`Found ${existing.length} departments. Skipping seed.`);
        }
        
        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit(0);
    }
}

run();
