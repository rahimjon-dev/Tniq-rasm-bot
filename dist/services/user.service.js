import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import logger from '../utils/logger.js';
import store from './store.service.js';
import PlanService from './plan.service.js';
export class UserService {
    static async getUserLanguage(telegramId) {
        const stored = store.getUser(telegramId);
        if (stored && stored.languageCode) {
            return stored.languageCode;
        }
        if (!isDatabaseAvailable()) {
            return null;
        }
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(telegramId) },
                select: { languageCode: true },
            });
            if (user?.languageCode) {
                store.saveUser({ telegramId, languageCode: user.languageCode });
                return user.languageCode;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    static async setUserLanguage(telegramId, languageCode) {
        store.saveUser({
            telegramId,
            languageCode,
            lastAction: `Language changed to ${languageCode}`,
        });
        if (isDatabaseAvailable()) {
            try {
                await prisma.user.update({
                    where: { telegramId: BigInt(telegramId) },
                    data: { languageCode },
                });
            }
            catch { }
        }
    }
    static async findOrCreateUser(params) {
        const telegramIdBigInt = BigInt(params.telegramId);
        // 1. Save to persistent store immediately
        const storedUser = store.saveUser({
            telegramId: params.telegramId,
            username: params.username,
            firstName: params.firstName,
            lastName: params.lastName,
            languageCode: params.languageCode,
            lastAction: params.lastAction || 'User /start',
        });
        if (!isDatabaseAvailable()) {
            return {
                id: storedUser.id,
                telegramId: telegramIdBigInt,
                username: storedUser.username,
                firstName: storedUser.firstName,
                lastName: storedUser.lastName,
                languageCode: storedUser.languageCode,
                isBanned: storedUser.isBanned,
                createdAt: new Date(storedUser.createdAt),
                updatedAt: new Date(storedUser.updatedAt),
                plan: storedUser.plan,
                subscription: {
                    id: `sub_${storedUser.telegramId}`,
                    userId: storedUser.id,
                    plan: storedUser.plan,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
        }
        try {
            const user = await prisma.user.upsert({
                where: { telegramId: telegramIdBigInt },
                update: {
                    username: params.username || undefined,
                    firstName: params.firstName || undefined,
                    languageCode: params.languageCode || undefined,
                },
                create: {
                    telegramId: telegramIdBigInt,
                    username: params.username || undefined,
                    firstName: params.firstName || undefined,
                    languageCode: params.languageCode || 'uz',
                    subscription: {
                        create: {
                            plan: storedUser.plan === 'PREMIUM' ? 'PRO' : storedUser.plan,
                            status: 'ACTIVE',
                        },
                    },
                },
                include: {
                    subscription: true,
                },
            });
            return {
                ...user,
                plan: storedUser.plan,
            };
        }
        catch (error) {
            logger.debug('Database error in findOrCreateUser, using persistent store:', error);
            return {
                id: storedUser.id,
                telegramId: telegramIdBigInt,
                username: storedUser.username,
                firstName: storedUser.firstName,
                lastName: storedUser.lastName,
                languageCode: storedUser.languageCode,
                isBanned: storedUser.isBanned,
                createdAt: new Date(storedUser.createdAt),
                updatedAt: new Date(storedUser.updatedAt),
                plan: storedUser.plan,
                subscription: {
                    id: `sub_${storedUser.telegramId}`,
                    userId: storedUser.id,
                    plan: storedUser.plan,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
        }
    }
    static async setUserPlan(telegramId, plan) {
        const normalized = PlanService.normalizePlan(plan);
        const ok = store.setUserPlan(telegramId, normalized);
        if (isDatabaseAvailable()) {
            try {
                const idBig = BigInt(telegramId);
                const user = await prisma.user.findUnique({ where: { telegramId: idBig } });
                if (user) {
                    await prisma.subscription.upsert({
                        where: { userId: user.id },
                        update: { plan: normalized === 'PREMIUM' ? 'PRO' : normalized },
                        create: {
                            userId: user.id,
                            plan: normalized === 'PREMIUM' ? 'PRO' : normalized,
                            status: 'ACTIVE',
                        },
                    });
                }
            }
            catch (err) {
                logger.debug('Prisma setUserPlan notice:', err);
            }
        }
        return ok;
    }
    static async upgradeUserSubscription(telegramId, plan, durationDays = 30) {
        return this.setUserPlan(telegramId, plan);
    }
    static async getUserTotalJobsCount(userId) {
        if (!isDatabaseAvailable()) {
            return 0;
        }
        try {
            return await prisma.mediaJob.count({
                where: { userId, status: 'COMPLETED' },
            });
        }
        catch {
            return 0;
        }
    }
    static async getUserHistory(userId, limit = 5) {
        if (!isDatabaseAvailable()) {
            return store.getRecentJobs(limit);
        }
        try {
            return await prisma.mediaJob.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
        }
        catch {
            return store.getRecentJobs(limit);
        }
    }
    static updateActivity(telegramId, action) {
        store.updateUserActivity(telegramId, action);
    }
    static setUserCustomBackground(telegramId, backgroundPath) {
        return store.setUserCustomBackground(telegramId, backgroundPath);
    }
    static getUserCustomBackground(telegramId) {
        return store.getUserCustomBackground(telegramId);
    }
}
export default UserService;
//# sourceMappingURL=user.service.js.map