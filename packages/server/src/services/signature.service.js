import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { signature, user } from '../db/schema.js';

export const SignatureService = {

    /**
     * Get all signatures with user info
     */
    async getAllSignatures() {
        return await db.select({
            id: signature.id,
            userId: signature.userId,
            userName: user.name,
            userRole: user.role,
            imagePath: signature.imagePath,
            uploadedBy: signature.uploadedBy,
            createdAt: signature.createdAt
        })
            .from(signature)
            .innerJoin(user, eq(signature.userId, user.id));
    },

    /**
     * Save a new signature image path for a user
     */
    async saveSignature(userId, imagePath, uploaderId) {
        return await db.transaction(async (tx) => {
            // 1. Delete previous signature if exists
            await tx.delete(signature).where(eq(signature.userId, userId));

            // 2. Insert new signature
            const [newSig] = await tx.insert(signature).values({
                userId,
                imagePath,
                uploadedBy: uploaderId
            }).returning();

            return newSig;
        });
    }
};
