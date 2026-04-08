import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { role } from '../db/schema.js';

export const RoleService = {
    /**
     * Get all roles
     */
    async getAllRoles() {
        return await db.select().from(role).orderBy(role.name);
    },

    /**
     * Add a new role
     */
    async addRole(id, name) {
        const [newRole] = await db.insert(role).values({
            id,
            name
        }).returning();
        return newRole;
    },

    /**
     * Delete a role
     */
    async deleteRole(id) {
        await db.delete(role).where(eq(role.id, id));
        return { success: true };
    }
};
