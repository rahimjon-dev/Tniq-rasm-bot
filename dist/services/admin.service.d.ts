import { UserPlan } from '../types/user.types.js';
export interface SystemStats {
    totalUsers: number;
    totalJobs: number;
    imageJobs: number;
    videoJobs: number;
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
    /**
     * Search users with query, pagination, and total count
     */
    static searchUsers(query?: string, page?: number, limit?: number): Promise<{
        users: {
            subscription: {
                plan: UserPlan;
                status: string;
            };
            id: string;
            telegramId: string;
            username: string | null;
            firstName: string | null;
            languageCode: string | null;
            plan: UserPlan;
            isBanned: boolean;
            createdAt: string;
            updatedAt: string;
            totalJobs: number;
        }[];
        total: number;
        page: number;
        totalPages: number;
    } | {
        users: {
            telegramId: string;
            totalJobs: number;
            subscription: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                status: import(".prisma/client").$Enums.SubscriptionStatus;
                plan: import(".prisma/client").$Enums.PlanType;
                startDate: Date;
                endDate: Date | null;
            } | null;
            _count: {
                jobs: number;
            };
            id: string;
            username: string | null;
            firstName: string | null;
            languageCode: string | null;
            isBanned: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get list of recent users
     */
    static getRecentUsers(limit?: number): Promise<{
        subscription: {
            plan: UserPlan;
            status: string;
        };
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string | null;
        languageCode: string | null;
        plan: UserPlan;
        isBanned: boolean;
        createdAt: string;
        updatedAt: string;
        totalJobs: number;
    }[] | {
        telegramId: string;
        subscription: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            plan: import(".prisma/client").$Enums.PlanType;
            startDate: Date;
            endDate: Date | null;
        } | null;
        id: string;
        username: string | null;
        firstName: string | null;
        languageCode: string | null;
        isBanned: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Get list of recent media processing jobs
     */
    static getRecentJobs(limit?: number): Promise<{
        user: {
            telegramId: string;
            firstName: string | null;
            username: string | null;
        } | null;
        id: string;
        telegramId: string;
        type: "IMAGE" | "VIDEO";
        status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
        scale: number;
        targetResolution?: string;
        inputResolution?: string;
        outputResolution?: string;
        processingTime?: number;
        createdAt: string;
    }[] | {
        inputSize: string | null;
        outputSize: string | null;
        user: {
            telegramId: string;
            id: string;
            username: string | null;
            firstName: string | null;
            languageCode: string | null;
            isBanned: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        type: import(".prisma/client").$Enums.JobType;
        id: string;
        createdAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.JobStatus;
        scale: number;
        targetResolution: string | null;
        inputResolution: string | null;
        outputResolution: string | null;
        processingTime: number | null;
        errorMessage: string | null;
        completedAt: Date | null;
    }[]>;
    /**
     * Broadcast rich message (text, photo, video, button) to all registered bot users
     */
    static broadcastMessage(payload: string | {
        text: string;
        mediaType?: 'text' | 'photo' | 'video';
        mediaUrl?: string;
        buttonText?: string;
        buttonUrl?: string;
    }): Promise<{
        total: number;
        sent: number;
        failed: number;
    }>;
    /**
     * Ban a user by Telegram ID
     */
    static banUser(telegramId: number | bigint | string): Promise<boolean>;
    /**
     * Unban a user by Telegram ID
     */
    static unbanUser(telegramId: number | bigint | string): Promise<boolean>;
    /**
     * Manually grant a subscription plan to any user
     */
    static setPlan(telegramId: number, plan: UserPlan, durationDays?: number): Promise<boolean>;
}
export default AdminService;
