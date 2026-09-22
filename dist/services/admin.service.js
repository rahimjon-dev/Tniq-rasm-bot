import os from 'os';
import prisma, { checkDatabaseConnection } from '../database/prisma.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { imageQueue, videoQueue, checkRedisConnection } from '../queue/queue.client.js';
import { bot } from '../bot/bot.instance.js';
import store from './store.service.js';
import PlanService from './plan.service.js';
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
        const [dbConnected, redisConnected] = await Promise.all([
            checkDatabaseConnection(),
            checkRedisConnection(),
        ]);
        const detailed = store.getDetailedStats();
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
            catch (e) {
                logger.warn('Failed to retrieve queue counts:', e);
            }
        }
        const memoryUsage = process.memoryUsage();
        return {
            totalUsers: detailed.totalUsers,
            activeUsers: detailed.activeUsers,
            newUsersToday: detailed.newUsersToday,
            imagesToday: detailed.imagesToday,
            videosToday: detailed.videosToday,
            imageJobs: detailed.totalImages,
            videoJobs: detailed.totalVideos,
            freeUsers: detailed.freeUsers,
            premiumUsers: detailed.premiumUsers,
            proUsers: detailed.proUsers,
            totalImages: detailed.totalImages,
            totalVideos: detailed.totalVideos,
            totalJobs: detailed.totalJobs,
            failedJobs: detailed.failedJobs,
            successRatePercent: detailed.successRatePercent,
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
    static async banUser(telegramId) {
        return this.setUserBanStatus(telegramId, true);
    }
    static async unbanUser(telegramId) {
        return this.setUserBanStatus(telegramId, false);
    }
    static async setPlan(telegramId, plan, durationDays = 30) {
        return this.updateUserPlan(telegramId, plan);
    }
    /**
     * Search users with query, pagination, plan filter, status filter, and total count
     */
    static async searchUsers(query = '', page = 1, limit = 20, planFilter = '', statusFilter = '') {
        return store.getAllUsers(query, page, limit, planFilter, statusFilter);
    }
    /**
     * Get single user full details
     */
    static async getUserDetails(telegramId) {
        const key = telegramId.toString();
        const user = store.getUser(key);
        if (!user)
            return null;
        const limits = PlanService.getLimits(user.plan);
        return {
            ...user,
            limits,
            remainingImages: limits.isUnlimitedImages ? 'Unlimited' : Math.max(0, limits.dailyImages - (user.dailyUsage?.images || 0)),
            remainingVideos: limits.isUnlimitedVideos ? 'Unlimited' : Math.max(0, limits.dailyVideos - (user.dailyUsage?.videos || 0)),
        };
    }
    /**
     * Reset user's daily usage counters
     */
    static async resetUserDailyUsage(telegramId) {
        const key = telegramId.toString();
        return store.resetUserDailyUsage(key);
    }
    /**
     * Update a user's subscription plan directly (FREE | PREMIUM | PRO)
     */
    static async updateUserPlan(telegramId, plan) {
        const key = telegramId.toString();
        const normalized = PlanService.normalizePlan(plan);
        const storeUpdated = store.setUserPlan(key, normalized);
        const isDbOk = await checkDatabaseConnection();
        if (isDbOk) {
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
                logger.debug('Prisma updateUserPlan notice:', err);
            }
        }
        return storeUpdated;
    }
    /**
     * Set ban status for user
     */
    static async setUserBanStatus(telegramId, isBanned) {
        const key = telegramId.toString();
        const storeUpdated = store.setUserBan(key, isBanned);
        const isDbOk = await checkDatabaseConnection();
        if (isDbOk) {
            try {
                const idBig = BigInt(telegramId);
                await prisma.user.updateMany({
                    where: { telegramId: idBig },
                    data: { isBanned },
                });
            }
            catch (err) {
                logger.debug('Prisma setUserBanStatus notice:', err);
            }
        }
        return storeUpdated;
    }
    /**
     * Get list of recent users
     */
    static async getRecentUsers(limit = 10) {
        return store.getAllUsers('', 1, limit).users;
    }
    /**
     * Get list of recent media processing jobs
     */
    static async getRecentJobs(limit = 10) {
        return store.getRecentJobs(limit);
    }
    /**
     * Search and filter media jobs with pagination
     */
    static async getJobs(params) {
        return store.getJobs(params);
    }
    /**
     * Broadcast message to all active users with support for Text, Photo, Video, and Inline URLs
     */
    static async broadcastMessage(messageText, options = {}) {
        const activeTelegramIds = store.getAllActiveTelegramIds();
        let sent = 0;
        let failed = 0;
        const total = activeTelegramIds.length;
        // Construct optional inline button
        let replyMarkup = undefined;
        if (options.buttonText && options.buttonUrl) {
            replyMarkup = {
                inline_keyboard: [
                    [{ text: options.buttonText, url: options.buttonUrl }],
                ],
            };
        }
        const hasMedia = options.mediaType && options.mediaType !== 'none' && options.mediaUrl;
        logger.info(`[BROADCAST] Starting broadcast to ${total} users. Type=${options.mediaType || 'text'}`);
        for (const id of activeTelegramIds) {
            try {
                if (hasMedia && options.mediaType === 'photo') {
                    try {
                        await bot.telegram.sendPhoto(id, options.mediaUrl, {
                            caption: messageText,
                            parse_mode: 'HTML',
                            reply_markup: replyMarkup,
                        });
                    }
                    catch {
                        // Fallback plain text caption if HTML entity error
                        await bot.telegram.sendPhoto(id, options.mediaUrl, {
                            caption: messageText,
                            reply_markup: replyMarkup,
                        });
                    }
                }
                else if (hasMedia && options.mediaType === 'video') {
                    try {
                        await bot.telegram.sendVideo(id, options.mediaUrl, {
                            caption: messageText,
                            parse_mode: 'HTML',
                            reply_markup: replyMarkup,
                            supports_streaming: true,
                        });
                    }
                    catch {
                        await bot.telegram.sendVideo(id, options.mediaUrl, {
                            caption: messageText,
                            reply_markup: replyMarkup,
                            supports_streaming: true,
                        });
                    }
                }
                else {
                    // Standard text message
                    try {
                        await bot.telegram.sendMessage(id, messageText, {
                            parse_mode: 'HTML',
                            reply_markup: replyMarkup,
                        });
                    }
                    catch {
                        await bot.telegram.sendMessage(id, messageText, {
                            reply_markup: replyMarkup,
                        });
                    }
                }
                sent++;
            }
            catch (err) {
                failed++;
                logger.warn(`Failed to broadcast to user ${id}:`, err);
            }
            // Safe rate-limiting for Telegram API
            await new Promise((resolve) => setTimeout(resolve, 35));
        }
        logger.info(`[BROADCAST] Completed: Sent=${sent}, Failed=${failed}, Total=${total}`);
        return { sent, failed, total };
    }
}
export default AdminService;
//# sourceMappingURL=admin.service.js.map