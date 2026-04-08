import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { user, userProfile, account } from '../db/schema.js';
import { auth } from '../auth.js';

/**
 * Hash password using scrypt (same algorithm Better Auth uses internally).
 * Format: salt:hash (both hex encoded)
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

export const UserService = {
    /**
     * Get all users with their DMS profiles
     */
    async getAllUsers() {
        return await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            banned: user.banned,
            branches: userProfile.branches,
            department: userProfile.department,
            isAbsent: userProfile.isAbsent,
            delegatedToUserId: userProfile.delegatedToUserId
        })
            .from(user)
            .leftJoin(userProfile, eq(user.id, userProfile.userId));
    },

    /**
     * Update user details (name, email, role, branches, department)
     */
    async updateUser(userId, { name, email, role, branches, department }) {
        const now = new Date();

        // Update user table
        const userUpdates = {};
        if (name !== undefined) userUpdates.name = name;
        if (email !== undefined) userUpdates.email = email;
        if (role !== undefined) userUpdates.role = role;
        userUpdates.updatedAt = now;

        await db.update(user).set(userUpdates).where(eq(user.id, userId));

        // Update profile (branches and/or department) if provided
        if (branches !== undefined || department !== undefined) {
            const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1);
            
            const profileUpdates = {};
            if (branches !== undefined) profileUpdates.branches = branches;
            if (department !== undefined) profileUpdates.department = department;

            if (profile) {
                await db.update(userProfile).set(profileUpdates).where(eq(userProfile.userId, userId));
            } else {
                await db.insert(userProfile).values({ 
                    userId, 
                    branches: branches || ['Astara Hotel'],
                    department
                });
            }
        }

        return { success: true };
    },

    /**
     * Reset user password (admin action)
     */
    async resetPassword(userId, newPassword) {
        const hashedPassword = await hashPassword(newPassword);

        // Update password in the account table (credential provider)
        const result = await db.update(account)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

        return { success: true };
    },

    /**
     * Delete a user entirely (cascades to sessions, accounts, profiles, etc.)
     */
    async deleteUser(userId) {
        await db.delete(user).where(eq(user.id, userId));
        return { success: true };
    },

    /**
     * Set user absence and delegation
     */
    async setDelegation(userId, isAbsent, delegatedToUserId, startDate, endDate) {
        let [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1);

        if (profile) {
            await db.update(userProfile)
                .set({
                    isAbsent,
                    delegatedToUserId: isAbsent ? delegatedToUserId : null,
                    absenceStartDate: isAbsent ? startDate : null,
                    absenceEndDate: isAbsent ? endDate : null
                })
                .where(eq(userProfile.userId, userId));
        } else {
            await db.insert(userProfile).values({
                userId,
                branches: ['Astara Hotel'],
                isAbsent,
                delegatedToUserId: isAbsent ? delegatedToUserId : null,
                absenceStartDate: isAbsent ? startDate : null,
                absenceEndDate: isAbsent ? endDate : null
            });
        }

        return { success: true };
    },

    /**
     * Sync user profile for a newly created user
     */
    async syncProfile(userId, branches, department) {
        const [existing] = await db.select().from(userProfile).where(eq(userProfile.userId, userId));
        if (!existing) {
            await db.insert(userProfile).values({
                userId,
                branches: branches || ['Astara Hotel'],
                department: department || null
            });
        }
    }
};
