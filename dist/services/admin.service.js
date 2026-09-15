import os from 'os';
import prisma, { checkDatabaseConnection } from '../database/prisma.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { imageQueue, videoQueue, checkRedisConnection } from '../queue/queue.client.js';
import { bot } from '../bot/bot.instance.js';
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
            logger.error('[ADMIN_SERVICE] searchUsers failed:', e);
            return { users: [], total: 0, page: 1, totalPages: 1 };
        }
    }
    /**
     * Get list of recent users
     */
    static async getRecentUsers(limit = 10) {
        try {
            const users = await prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { subscription: true },
            });
            return users.map((u) => ({
                ...u,
                telegramId: u.telegramId.toString(),
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Get list of recent media processing jobs
     */
    static async getRecentJobs(limit = 10) {
        try {
            const jobs = await prisma.mediaJob.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { user: true },
            });
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
            return [];
        }
    }
    /**
     * Broadcast message to all registered bot users
     */
    static async broadcastMessage(text) {
        let users = [];
        try {
            users = await prisma.user.findMany({
                where: { isBanned: false },
                select: { telegramId: true },
            });
        }
        catch {
            logger.warn('Database offline during broadcast.');
        }
        if (users.length === 0) {
            return { total: 0, sent: 0, failed: 0 };
        }
        let sent = 0;
        let failed = 0;
        logger.info(`[BROADCAST] Initiating broadcast to ${users.length} users...`);
        for (const u of users) {
            try {
                await bot.telegram.sendMessage(Number(u.telegramId), text, {
                    parse_mode: 'HTML',
                });
                sent++;
            }
            catch (err) {
                failed++;
            }
            // Anti-flood pause: 35ms between messages (~28 messages/sec, within Telegram 30/s limit)
            await new Promise((res) => setTimeout(res, 35));
        }
        logger.info(`[BROADCAST_COMPLETE] Total: ${users.length}, Sent: ${sent}, Failed: ${failed}`);
        return { total: users.length, sent, failed };
    }
    /**
     * Ban a user by Telegram ID
     */
    static async banUser(telegramId) {
        try {
            await prisma.user.update({
                where: { telegramId: BigInt(telegramId) },
                data: { isBanned: true },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Unban a user by Telegram ID
     */
    static async unbanUser(telegramId) {
        try {
            await prisma.user.update({
                where: { telegramId: BigInt(telegramId) },
                data: { isBanned: false },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Manually grant a subscription plan to any user
     */
    static async setPlan(telegramId, plan, durationDays = 30) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: BigInt(telegramId) },
            });
            if (!user)
                return false;
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
            return true;
        }
        catch {
            return false;
        }
    }
}
export default AdminService;
//# sourceMappingURL=admin.service.js.map