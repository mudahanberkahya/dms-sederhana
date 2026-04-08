import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { documentCategory } from '../db/schema.js';

export const CategoryService = {
    /**
     * Get all categories
     */
    async getAllCategories() {
        return await db.select().from(documentCategory).orderBy(documentCategory.name);
    },

    /**
     * Add a new category
     */
    async addCategory(id, name) {
        const [newCat] = await db.insert(documentCategory).values({
            id,
            name
        }).returning();
        return newCat;
    },

    /**
     * Delete a category
     */
    async deleteCategory(id) {
        await db.delete(documentCategory).where(eq(documentCategory.id, id));
        return { success: true };
    }
};
