import { UserPlan } from '../types/user.types.js';
export interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    imagesToday: number;
    videosToday: number;
    imageJobs: number;
    videoJobs: number;
    freeUsers: number;
    premiumUsers: number;
    proUsers: number;
    totalImages: number;
    totalVideos: number;
    totalJobs: number;
    failedJobs: number;
    successRatePercent: number;
    queueStatus: {
        redisConnected: boolean;
        databaseConnected: boolean;
        imageWaiting: number;
        imageActive: number;
        videoWaiting: number;
        videoActive: number;
    };
    server: {
        uptimeSeconds: number;
        memoryUsedMB: number;
        cpuCores: number;
        nodeVersion: string;
    };
}
export declare class AdminService {
    /**
     * Check if a Telegram ID is an authorized administrator
     */
    static isAdmin(telegramId: number | bigint): boolean;
    /**
     * Gather comprehensive system analytics and health metrics
     */
    static getSystemStats(): Promise<SystemStats>;
    static banUser(telegramId: number | bigint | string): Promise<boolean>;
    static unbanUser(telegramId: number | bigint | string): Promise<boolean>;
    static setPlan(telegramId: number | bigint | string, plan: UserPlan, durationDays?: number): Promise<boolean>;
    /**
     * Search users with query, pagination, plan filter, status filter, and total count
     */
    static searchUsers(query?: string, page?: number, limit?: number, planFilter?: string, statusFilter?: string): Promise<{
        users: {
            isActiveNow: boolean;
            subscription: {
                plan: UserPlan;
                status: string;
            };
            remainingImages: string | number;
            remainingVideos: string | number;
            id: string;
            telegramId: string;
            username: string | null;
            firstName: string | null;
            lastName: string | null;
            languageCode: string | null;
            plan: UserPlan;
            isBanned: boolean;
            createdAt: string;
            updatedAt: string;
            lastActivityDate: string;
            lastAction: string | null;
            dailyUsage: import("./store.service.js").UserDailyUsage;
            totalImages: number;
            totalVideos: number;
            totalJobs: number;
            customBackground: string | null;
            metadata?: Record<string, any>;
        }[];
        total: number;
        allUsersCount: number;
        activeUsersCount: number;
        proUsersCount: number;
        inactiveUsersCount: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get single user full details
     */
    static getUserDetails(telegramId: string | number | bigint): Promise<{
        limits: import("../types/user.types.js").PlanLimits;
        remainingImages: string | number;
        remainingVideos: string | number;
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
        plan: UserPlan;
        isBanned: boolean;
        createdAt: string;
        updatedAt: string;
        lastActivityDate: string;
        lastAction: string | null;
        dailyUsage: import("./store.service.js").UserDailyUsage;
        totalImages: number;
        totalVideos: number;
        totalJobs: number;
        customBackground: string | null;
        metadata?: Record<string, any>;
    } | null>;
    /**
     * Reset user's daily usage counters
     */
    static resetUserDailyUsage(telegramId: string | number | bigint): Promise<boolean>;
    /**
     * Update a user's subscription plan directly (FREE | PREMIUM | PRO)
     */
    static updateUserPlan(telegramId: number | bigint | string, plan: UserPlan): Promise<boolean>;
    /**
     * Set ban status for user
     */
    static setUserBanStatus(telegramId: number | bigint | string, isBanned: boolean): Promise<boolean>;
    /**
     * Get list of recent users
     */
    static getRecentUsers(limit?: number): Promise<{
        isActiveNow: boolean;
        subscription: {
            plan: UserPlan;
            status: string;
        };
        remainingImages: string | number;
        remainingVideos: string | number;
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
        plan: UserPlan;
        isBanned: boolean;
        createdAt: string;
        updatedAt: string;
        lastActivityDate: string;
        lastAction: string | null;
        dailyUsage: import("./store.service.js").UserDailyUsage;
        totalImages: number;
        totalVideos: number;
        totalJobs: number;
        customBackground: string | null;
        metadata?: Record<string, any>;
    }[]>;
    /**
     * Get list of recent media processing jobs
     */
    static getRecentJobs(limit?: number): Promise<import("./store.service.js").StoredJob[]>;
    /**
     * Search and filter media jobs with pagination
     */
    static getJobs(params: {
        query?: string;
        type?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        jobs: {
            user: {
                telegramId: string;
                firstName?: string | null;
                username?: string | null;
            } | null;
            id: string;
            telegramId: string;
            type: "IMAGE" | "VIDEO";
            status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
            scale: number;
            targetResolution?: string;
            inputResolution?: string;
            outputResolution?: string;
            inputSize?: number;
            outputSize?: number;
            processingTime?: number;
            createdAt: string;
        }[];
        total: number;
        page: number;
        totalPages: number;
        limit: number;
    }>;
    /**
     * Broadcast message to all active users with support for Text, Photo, Video, and Inline URLs
     */
    static broadcastMessage(messageText: string, options?: {
        mediaType?: 'none' | 'photo' | 'video';
        mediaUrl?: string;
        buttonText?: string;
        buttonUrl?: string;
    }): Promise<{
        sent: number;
        failed: number;
        total: number;
    }>;
}
export default AdminService;
