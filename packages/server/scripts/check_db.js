import 'dotenv/config';
import { db } from '../src/db/index.js';
import { documentCategory, workflow, workflowStep } from '../src/db/schema.js';

async function check() {
    const categories = await db.select().from(documentCategory);
    console.log("CATEGORIES:", categories);

    const workflows = await db.select().from(workflow);
    console.log("WORKFLOWS:", workflows);

    const steps = await db.select().from(workflowStep);
    console.log("WORKFLOW STEPS:", steps);

    process.exit(0);
}
check();
