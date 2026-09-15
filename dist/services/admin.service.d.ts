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
     * Get list of recent users
     */
    static getRecentUsers(limit?: number): Promise<({
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
    } & {
        id: string;
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        languageCode: string | null;
        isBanned: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    /**
     * Get list of recent media processing jobs
     */
    static getRecentJobs(limit?: number): Promise<({
        user: {
            id: string;
            telegramId: bigint;
            username: string | null;
            firstName: string | null;
            languageCode: string | null;
            isBanned: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        type: import(".prisma/client").$Enums.JobType;
        id: string;
        createdAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.JobStatus;
        scale: number;
        targetResolution: string | null;
        inputResolution: string | null;
        outputResolution: string | null;
        inputSize: bigint | null;
        outputSize: bigint | null;
        processingTime: number | null;
        errorMessage: string | null;
        completedAt: Date | null;
    })[]>;
    /**
     * Broadcast message to all registered bot users
     */
    static broadcastMessage(text: string): Promise<{
        total: number;
        sent: number;
        failed: number;
    }>;
    /**
     * Ban a user by Telegram ID
     */
    static banUser(telegramId: number): Promise<boolean>;
    /**
     * Unban a user by Telegram ID
     */
    static unbanUser(telegramId: number): Promise<boolean>;
    /**
     * Manually grant a subscription plan to any user
     */
    static setPlan(telegramId: number, plan: UserPlan, durationDays?: number): Promise<boolean>;
}
export default AdminService;
