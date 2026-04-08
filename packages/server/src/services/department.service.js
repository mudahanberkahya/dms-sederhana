import { db } from '../db/index.js';
import { departmentRef } from '../db/schema.js';
import { eq } from 'drizzle-orm';

class DepartmentService {
    async getAllDepartments() {
        return await db.select().from(departmentRef).orderBy(departmentRef.id);
    }

    async getDepartmentById(id) {
        const [department] = await db.select().from(departmentRef).where(eq(departmentRef.id, id));
        return department;
    }

    async createDepartment(data) {
        const [newDept] = await db.insert(departmentRef).values({
            id: data.id,
            name: data.name
        }).returning();
        return newDept;
    }

    async updateDepartment(id, data) {
        const [updatedDept] = await db.update(departmentRef)
            .set({ name: data.name })
            .where(eq(departmentRef.id, id))
            .returning();
        return updatedDept;
    }

    async deleteDepartment(id) {
        const [deletedDept] = await db.delete(departmentRef)
            .where(eq(departmentRef.id, id))
            .returning();
        return deletedDept;
    }
}

export default new DepartmentService();
