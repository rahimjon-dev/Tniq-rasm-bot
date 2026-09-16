import { UserPlan } from '../types/user.types.js';
export declare class UsageService {
    /**
     * Current date string in Asia/Tashkent timezone (YYYY-MM-DD)
     */
    static getTodayDateString(): string;
    /**
     * Get quota summary for a user
     */
    static getUserUsageSummary(userId: string, telegramId: string | number | bigint, plan: UserPlan): Promise<{
        date: string;
        plan: UserPlan;
        imagesUsed: number;
        imagesMax: number;
        imagesRemaining: number;
        isUnlimitedImages: boolean;
        videosUsed: number;
        videosMax: number;
        videosRemaining: number;
        isUnlimitedVideos: boolean;
        canUse4K: boolean;
        maxImageSizeMB: number;
        maxVideoSizeMB: number;
        hasCustomBackground: boolean;
    }>;
    /**
     * Check if user can process an image (server-side check)
     */
    static canProcessImage(userId: string, telegramId: string | number | bigint, plan: UserPlan): Promise<{
        allowed: boolean;
        remaining: number | string;
        maxLimit: number | string;
    }>;
    /**
     * Check if user can process a video (server-side check)
     */
    static canProcessVideo(userId: string, telegramId: string | number | bigint, plan: UserPlan): Promise<{
        allowed: boolean;
        remaining: number | string;
        maxLimit: number | string;
    }>;
    /**
     * Atomic reservation of quota to prevent race-condition concurrency bypasses
     */
    static reserveImageQuota(userId: string, telegramId: string | number | bigint, plan: UserPlan): Promise<boolean>;
    static releaseImageReservation(telegramId: string | number | bigint): void;
    static reserveVideoQuota(userId: string, telegramId: string | number | bigint, plan: UserPlan): Promise<boolean>;
    static releaseVideoReservation(telegramId: string | number | bigint): void;
    /**
     * Permanently increments image usage in persistent storage & PostgreSQL
     */
    static incrementImageUsage(userId: string, telegramId: string | number | bigint): Promise<void>;
    /**
     * Permanently increments video usage in persistent storage & PostgreSQL
     */
    static incrementVideoUsage(userId: string, telegramId: string | number | bigint): Promise<void>;
    /**
     * Record completed media job into persistent store and database
     */
    static recordJob(params: {
        userId: string;
        telegramId: string | number | bigint;
        type: 'IMAGE' | 'VIDEO';
        scale: number;
        status: 'COMPLETED' | 'FAILED';
        inputResolution?: string;
        outputResolution?: string;
        inputSize?: number;
        outputSize?: number;
        processingTimeSeconds?: number;
    }): Promise<void>;
    /**
     * Reset user's daily usage (for Admin)
     */
    static resetUserUsage(userId: string, telegramId: string | number | bigint): Promise<boolean>;
}
export default UsageService;
