import os from 'os';
import prisma, { checkDatabaseConnection } from '../database/prisma.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { imageQueue, videoQueue, checkRedisConnection } from '../queue/queue.client.js';
import { bot } from '../bot/bot.instance.js';
import store from './store.service.js';
export class AdminService {
    /**
     * Check if a Telegram ID is an authorized administrator
     */
    static isAdmin(telegramId) {
        const idBigInt = BigInt(telegramId);
        return config.ADMIN_TELEGRAM_IDS.some((adminId) => adminId === idBigInt);
    }
    /**
     * Gather comprehensive system analytics and health metrics
     */
    static async getSystemStats() {
        let totalUsers = 0;
        let totalJobs = 0;
        let imageJobs = 0;
        let videoJobs = 0;
        let failedJobs = 0;
        const [dbConnected, redisConnected] = await Promise.all([
            checkDatabaseConnection(),
            checkRedisConnection(),
        ]);
        if (dbConnected) {
            try {
                const [usersCount, allJobs, failed] = await Promise.all([
                    prisma.user.count(),
                    prisma.mediaJob.count(),
                    prisma.mediaJob.count({ where: { status: 'FAILED' } }),
                ]);
                totalUsers = usersCount;
                totalJobs = allJobs;
                failedJobs = failed;
                const imgCount = await prisma.mediaJob.count({ where: { type: 'IMAGE' } });
                imageJobs = imgCount;
                videoJobs = Math.max(0, totalJobs - imageJobs);
            }
            catch (e) {
                logger.warn('Failed to query database for admin stats:', e);
            }
        }
        // Fallback to local persistent store if DB is offline or returned 0
        if (!dbConnected || totalUsers === 0) {
            const fallback = store.getStats();
            if (totalUsers === 0)
                totalUsers = fallback.totalUsers;
            if (totalJobs === 0) {
                totalJobs = fallback.totalJobs;
                imageJobs = fallback.imageJobs;
                videoJobs = fallback.videoJobs;
                failedJobs = fallback.failedJobs;
            }
        }
        // Queue counts from BullMQ
        let imageWaiting = 0;
        let imageActive = 0;
        let videoWaiting = 0;
        let videoActive = 0;
        if (redisConnected) {
            try {
                const [imgWait, imgAct, vidWait, vidAct] = await Promise.all([
                    imageQueue.getWaitingCount(),
                    imageQueue.getActiveCount(),
                    videoQueue.getWaitingCount(),
                    videoQueue.getActiveCount(),
                ]);
                imageWaiting = imgWait;
                imageActive = imgAct;
                videoWaiting = vidWait;
                videoActive = vidAct;
            }
            catch { }
        }
        const successRatePercent = totalJobs > 0
            ? Math.round(((totalJobs - failedJobs) / totalJobs) * 100)
            : 100;
        const memoryUsage = process.memoryUsage();
        return {
            totalUsers,
            totalJobs,
            imageJobs,
            videoJobs,
            failedJobs,
            successRatePercent,
            queueStatus: {
                redisConnected,
                databaseConnected: dbConnected,
                imageWaiting,
                imageActive,
                videoWaiting,
                videoActive,
            },
            server: {
                uptimeSeconds: Math.round(process.uptime()),
                memoryUsedMB: Math.round(memoryUsage.rss / (1024 * 1024)),
                cpuCores: os.cpus().length,
                nodeVersion: process.version,
            },
        };
    }
    /**
     * Search users with query, pagination, and total count
     */
    static async searchUsers(query = '', page = 1, limit = 20) {
        const isDbOk = await checkDatabaseConnection();
        if (!isDbOk) {
            return store.getAllUsers(query, page, limit);
        }
        const skip = (page - 1) * limit;
        const trimmed = query.trim();
        try {
            const whereClause = {};
            if (trimmed) {
                const isNumeric = !isNaN(Number(trimmed));
                if (isNumeric) {
                    whereClause.OR = [
                        { telegramId: BigInt(trimmed) },
                        { username: { contains: trimmed, mode: 'insensitive' } },
                        { firstName: { contains: trimmed, mode: 'insensitive' } },
                    ];
                }
                else {
                    whereClause.OR = [
                        { username: { contains: trimmed, mode: 'insensitive' } },
                        { firstName: { contains: trimmed, mode: 'insensitive' } },
                    ];
                }
            }
            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                    include: {
                        subscription: true,
                        _count: {
                            select: { jobs: true },
                        },
                    },
                }),
                prisma.user.count({ where: whereClause }),
            ]);
            if (total === 0 || store.getStats().totalUsers > total) {
                return store.getAllUsers(query, page, limit);
            }
            return {
                users: users.map((u) => ({
                    ...u,
                    telegramId: u.telegramId.toString(),
                    totalJobs: u._count.jobs,
                })),
                total,
                page,
                totalPages: Math.ceil(total / limit) || 1,
            };
        }
        catch (e) {
            return store.getAllUsers(query, page, limit);
        }
    }
    /**
     * Get list of recent users
     */
    static async getRecentUsers(limit = 10) {
        const isDbOk = await checkDatabaseConnection();
        if (!isDbOk) {
            return store.getAllUsers('', 1, limit).users;
        }
        try {
            const users = await prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { subscription: true },
            });
            if (users.length === 0) {
                return store.getAllUsers('', 1, limit).users;
            }
            return users.map((u) => ({
                ...u,
                telegramId: u.telegramId.toString(),
            }));
        }
        catch {
            return store.getAllUsers('', 1, limit).users;
        }
    }
    /**
     * Get list of recent media processing jobs
     */
    static async getRecentJobs(limit = 10) {
        const isDbOk = await checkDatabaseConnection();
        if (!isDbOk) {
            return store.getRecentJobs(limit);
        }
        try {
            const jobs = await prisma.mediaJob.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { user: true },
            });
            if (jobs.length === 0) {
                return store.getRecentJobs(limit);
            }
            return jobs.map((j) => ({
                ...j,
                inputSize: j.inputSize ? j.inputSize.toString() : null,
                outputSize: j.outputSize ? j.outputSize.toString() : null,
                user: j.user
                    ? {
                        ...j.user,
                        telegramId: j.user.telegramId.toString(),
                    }
                    : null,
            }));
        }
        catch {
            return store.getRecentJobs(limit);
        }
    }
    /**
     * Broadcast message to all registered bot users
     */
    static async broadcastMessage(text) {
        let targetIds = [];
        const dbConnected = await checkDatabaseConnection();
        if (dbConnected) {
            try {
                const users = await prisma.user.findMany({
                    where: { isBanned: false },
                    select: { telegramId: true },
                });
                targetIds = users.map((u) => Number(u.telegramId));
            }
            catch { }
        }
        // If DB is offline or empty, use store
        if (targetIds.length === 0) {
            targetIds = store.getAllActiveTelegramIds();
        }
        if (targetIds.length === 0) {
            return { total: 0, sent: 0, failed: 0 };
        }
        let sent = 0;
        let failed = 0;
        logger.info(`[BROADCAST] Initiating broadcast to ${targetIds.length} users...`);
        for (const tid of targetIds) {
            try {
                await bot.telegram.sendMessage(tid, text, {
                    parse_mode: 'HTML',
                });
                sent++;
            }
            catch (err) {
                failed++;
            }
            // Anti-flood pause: 35ms between messages (~28 messages/sec)
            await new Promise((res) => setTimeout(res, 35));
        }
        logger.info(`[BROADCAST_COMPLETE] Total: ${targetIds.length}, Sent: ${sent}, Failed: ${failed}`);
        return { total: targetIds.length, sent, failed };
    }
    /**
     * Ban a user by Telegram ID
     */
    static async banUser(telegramId) {
        const idStr = telegramId.toString();
        const ok = store.setUserBan(idStr, true);
        try {
            await prisma.user.update({
                where: { telegramId: BigInt(idStr) },
                data: { isBanned: true },
            });
        }
        catch { }
        return ok;
    }
    /**
     * Unban a user by Telegram ID
     */
    static async unbanUser(telegramId) {
        const idStr = telegramId.toString();
        const ok = store.setUserBan(idStr, false);
        try {
            await prisma.user.update({
                where: { telegramId: BigInt(idStr) },
                data: { isBanned: false },
            });
        }
        catch { }
        return ok;
    }
    /**
     * Manually grant a subscription plan to any user
     */
    static async setPlan(telegramId, plan, durationDays = 30) {
        store.setUserPlan(telegramId, plan);
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(telegramId) },
            });
            if (user) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + durationDays);
                await prisma.subscription.upsert({
                    where: { userId: user.id },
                    update: {
                        plan,
                        status: 'ACTIVE',
                        startDate: new Date(),
                        endDate,
                    },
                    create: {
                        userId: user.id,
                        plan,
                        status: 'ACTIVE',
                        startDate: new Date(),
                        endDate,
                    },
                });
            }
        }
        catch { }
        return true;
    }
}
export default AdminService;
//# sourceMappingURL=admin.service.js.map