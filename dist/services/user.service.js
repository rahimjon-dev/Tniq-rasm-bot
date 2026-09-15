import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import logger from '../utils/logger.js';
import store from './store.service.js';
export class UserService {
    static async getUserLanguage(telegramId) {
        // 1. Check local persistent store first
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
        // Save to persistent store
        store.saveUser({
            telegramId,
            languageCode,
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
        // Save to persistent store immediately
        const storedUser = store.saveUser({
            telegramId: params.telegramId,
            username: params.username,
            firstName: params.firstName,
            languageCode: params.languageCode,
        });
        if (!isDatabaseAvailable()) {
            return {
                id: storedUser.id,
                telegramId: telegramIdBigInt,
                username: storedUser.username,
                firstName: storedUser.firstName,
                languageCode: storedUser.languageCode,
                isBanned: storedUser.isBanned,
                createdAt: new Date(storedUser.createdAt),
                updatedAt: new Date(storedUser.updatedAt),
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
                    languageCode: params.languageCode || undefined,
                    subscription: {
                        create: {
                            plan: 'FREE',
                            status: 'ACTIVE',
                        },
                    },
                },
                include: {
                    subscription: true,
                },
            });
            return user;
        }
        catch (error) {
            logger.debug('Database offline, using persistent store for user:', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                id: storedUser.id,
                telegramId: telegramIdBigInt,
                username: storedUser.username,
                firstName: storedUser.firstName,
                languageCode: storedUser.languageCode,
                isBanned: storedUser.isBanned,
                createdAt: new Date(storedUser.createdAt),
                updatedAt: new Date(storedUser.updatedAt),
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
    static async getUserPlan(telegramId) {
        const user = await this.findOrCreateUser({ telegramId });
        return user.subscription?.plan || 'FREE';
    }
    static async getUserHistory(userId, limit = 5) {
        try {
            const jobs = await prisma.mediaJob.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            return jobs;
        }
        catch {
            return store.getRecentJobs(limit);
        }
    }
    static async getUserTotalJobsCount(userId) {
        try {
            return await prisma.mediaJob.count({ where: { userId } });
        }
        catch {
            return 0;
        }
    }
    static async upgradeUserSubscription(userId, plan, durationDays = 30) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        try {
            await prisma.subscription.upsert({
                where: { userId },
                update: {
                    plan,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate,
                },
                create: {
                    userId,
                    plan,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate,
                },
            });
        }
        catch { }
    }
}
export default UserService;
//# sourceMappingURL=user.service.js.map