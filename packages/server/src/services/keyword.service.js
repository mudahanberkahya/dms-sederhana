import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { keywordMapping } from '../db/schema.js';

export const KeywordService = {

    /**
     * Get all keyword mappings
     */
    async getAllKeywords() {
        return await db.select().from(keywordMapping).orderBy(keywordMapping.category);
    },

    /**
     * Add a new keyword mapping
     */
    async addKeywordMapping(data) {
        const { category, sub_category, branch, role, keyword, offset_x, offset_y, positionHint, step_order } = data;
        const [newMapping] = await db.insert(keywordMapping).values({
            category,
            subCategory: sub_category || null,
            branch,
            role,
            keyword,
            offset_x,
            offset_y,
            positionHint,
            stepOrder: step_order
        }).returning();
        return newMapping;
    },

    /**
     * Update an existing keyword mapping
     */
    async updateKeywordMapping(id, data) {
        const { category, sub_category, branch, role, keyword, offset_x, offset_y, positionHint, step_order } = data;
        const [updatedMapping] = await db.update(keywordMapping).set({
            category,
            subCategory: sub_category || null,
            branch,
            role,
            keyword,
            offset_x,
            offset_y,
            positionHint,
            stepOrder: step_order
        }).where(eq(keywordMapping.id, id)).returning();
        return updatedMapping;
    },

    /**
     * Delete a keyword mapping
     */
    async deleteKeywordMapping(id) {
        await db.delete(keywordMapping).where(eq(keywordMapping.id, id));
        return { success: true };
    }
};
