import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workflow, workflowStep } from '../db/schema.js';

export const WorkflowService = {
    /**
     * Get workflow by category
     */
    async getWorkflowByCategory(category) {
        const workflows = await db.select().from(workflow).where(eq(workflow.category, category));

        // For each workflow, get its steps
        const workflowsWithSteps = await Promise.all(workflows.map(async (wf) => {
            const steps = await db.select().from(workflowStep)
                .where(eq(workflowStep.workflowId, wf.id))
                .orderBy(workflowStep.stepOrder);
            return { ...wf, steps };
        }));

        return workflowsWithSteps;
    },

    /**
     * Create or update a workflow chain
     * Now supports sub_category for more specific workflow routing.
     */
    async saveWorkflow(category, branch, stepsArray, subCategory = null) {
        return await db.transaction(async (tx) => {
            // 1. Check if workflow exists for this category + branch + subCategory combo
            const conditions = [
                eq(workflow.category, category),
                eq(workflow.branch, branch)
            ];
            if (subCategory) {
                conditions.push(eq(workflow.subCategory, subCategory));
            } else {
                conditions.push(isNull(workflow.subCategory));
            }

            let [wf] = await tx.select().from(workflow)
                .where(and(...conditions))
                .limit(1);

            // 2. Insert workflow if not exists
            if (!wf) {
                [wf] = await tx.insert(workflow).values({ 
                    category, 
                    branch,
                    subCategory: subCategory || null
                }).returning();
            } else {
                // 3. Delete existing steps if updating
                await tx.delete(workflowStep).where(eq(workflowStep.workflowId, wf.id));
            }

            // 4. Insert new steps
            if (stepsArray && stepsArray.length > 0) {
                const stepsToInsert = stepsArray.map((step, index) => ({
                    workflowId: wf.id,
                    stepOrder: index + 1,
                    roleRequired: step.roleRequired,
                    isOptional: step.isOptional || false
                }));
                await tx.insert(workflowStep).values(stepsToInsert);
            }

            return wf;
        });
    }
};
