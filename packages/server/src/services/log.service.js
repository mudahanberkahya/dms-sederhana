import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { activityLog, user } from '../db/schema.js';

export const LogService = {

    /**
     * Create an activity log entry. Fire-and-forget — errors are logged but not thrown.
     * @param {string|null} userId - The user who performed the action
     * @param {string} action - Action type: DOCUMENT_UPLOADED, APPROVAL_GRANTED, etc.
     * @param {string} entity - Entity type: Document, Workflow, User, Keyword
     * @param {string|null} entityId - ID of the target entity
     * @param {string} details - Human-readable description
     * @param {object|null} metadata - Optional extra context (will be JSON-stringified)
     */
    async createLog(userId, action, entity, entityId, details, metadata = null) {
        try {
            await db.insert(activityLog).values({
                userId,
                action,
                entity,
                entityId,
                details,
                metadata: metadata ? JSON.stringify(metadata) : null
            });
        } catch (err) {
            console.error('[LogService] Failed to create log:', err.message);
        }
    },

    /**
     * Query logs with pagination and optional filters.
     * @param {Object} params - { limit, offset, action, startDate, endDate }
     * @returns {{ logs: Array, total: number }}
     */
    async getLogs(params = {}) {
        const { limit = 20, offset = 0, action, startDate, endDate } = params;

        const conditions = [];

        if (action) {
            conditions.push(eq(activityLog.action, action));
        }
        if (startDate) {
            conditions.push(gte(activityLog.createdAt, new Date(startDate)));
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            conditions.push(lte(activityLog.createdAt, endOfDay));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [countResult] = await db
            .select({ count: sql`count(*)::int` })
            .from(activityLog)
            .where(whereClause);

        const total = countResult?.count || 0;

        // Get paginated results with user name
        const logs = await db
            .select({
                id: activityLog.id,
                userId: activityLog.userId,
                userName: user.name,
                action: activityLog.action,
                entity: activityLog.entity,
                entityId: activityLog.entityId,
                details: activityLog.details,
                metadata: activityLog.metadata,
                createdAt: activityLog.createdAt
            })
            .from(activityLog)
            .leftJoin(user, eq(activityLog.userId, user.id))
            .where(whereClause)
            .orderBy(desc(activityLog.createdAt))
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        return { logs, total };
    }
};
