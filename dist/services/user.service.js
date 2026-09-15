import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import logger from '../utils/logger.js';
// In-memory fallback if database connection is offline during local development
const inMemoryUsers = new Map();
export class UserService {
    static async getUserLanguage(telegramId) {
        const telegramIdBigInt = BigInt(telegramId);
        const key = telegramIdBigInt.toString();
        const mem = inMemoryUsers.get(key);
        if (mem && mem.languageCode) {
            return mem.languageCode;
        }
        if (!isDatabaseAvailable()) {
            return null;
        }
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: telegramIdBigInt },
                select: { languageCode: true },
            });
            return user?.languageCode || null;
        }
        catch {
            return null;
        }
    }
    static async setUserLanguage(telegramId, languageCode) {
        const telegramIdBigInt = BigInt(telegramId);
        const key = telegramIdBigInt.toString();
        if (inMemoryUsers.has(key)) {
            inMemoryUsers.get(key).languageCode = languageCode;
        }
        else {
            inMemoryUsers.set(key, {
                id: `mem-${key}`,
                telegramId: telegramIdBigInt,
                plan: 'FREE',
                languageCode,
            });
        }
        if (isDatabaseAvailable()) {
            try {
                await prisma.user.update({
                    where: { telegramId: telegramIdBigInt },
                    data: { languageCode },
                });
            }
            catch { }
        }
    }
    static async findOrCreateUser(params) {
        const telegramIdBigInt = BigInt(params.telegramId);
        const key = telegramIdBigInt.toString();
        if (!isDatabaseAvailable()) {
            if (!inMemoryUsers.has(key)) {
                inMemoryUsers.set(key, {
                    id: `mem-${key}`,
                    telegramId: telegramIdBigInt,
                    username: params.username,
                    firstName: params.firstName,
                    languageCode: params.languageCode,
                    plan: 'FREE',
                });
            }
            const memUser = inMemoryUsers.get(key);
            return {
                id: memUser.id,
                telegramId: memUser.telegramId,
                username: memUser.username || null,
                firstName: memUser.firstName || null,
                languageCode: memUser.languageCode || params.languageCode || null,
                isBanned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                subscription: {
                    id: `sub-${key}`,
                    userId: memUser.id,
                    plan: memUser.plan,
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
                    username: params.username,
                    firstName: params.firstName,
                    languageCode: params.languageCode,
                },
                create: {
                    telegramId: telegramIdBigInt,
                    username: params.username,
                    firstName: params.firstName,
                    languageCode: params.languageCode,
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
            logger.debug('Database offline, using in-memory user tracking:', {
                error: error instanceof Error ? error.message : String(error),
            });
            if (!inMemoryUsers.has(key)) {
                inMemoryUsers.set(key, {
                    id: `mem-${key}`,
                    telegramId: telegramIdBigInt,
                    username: params.username,
                    firstName: params.firstName,
                    plan: 'FREE',
                });
            }
            const memUser = inMemoryUsers.get(key);
            return {
                id: memUser.id,
                telegramId: memUser.telegramId,
                username: memUser.username || null,
                firstName: memUser.firstName || null,
                languageCode: params.languageCode || null,
                isBanned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                subscription: {
                    id: `sub-${key}`,
                    userId: memUser.id,
                    plan: memUser.plan,
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
            return [];
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
        catch {
            for (const [key, user] of inMemoryUsers.entries()) {
                if (user.id === userId) {
                    user.plan = plan;
                    inMemoryUsers.set(key, user);
                    break;
                }
            }
        }
    }
}
export default UserService;
//# sourceMappingURL=user.service.js.map