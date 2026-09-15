import { UserPlan } from '../types/user.types.js';
export declare class UsageService {
    private static getTodayDateString;
    static getMaxImagesForPlan(plan: UserPlan): number;
    static canProcessImage(userId: string, plan: UserPlan): Promise<{
        allowed: boolean;
        remaining: number;
        maxLimit: number;
    }>;
    static incrementImageUsage(userId: string): Promise<void>;
    static getMaxVideosForPlan(plan: UserPlan): number;
    static canProcessVideo(userId: string, plan: UserPlan): Promise<{
        allowed: boolean;
        remaining: number;
        maxLimit: number;
    }>;
    static incrementVideoUsage(userId: string): Promise<void>;
    static recordJob(params: {
        userId: string;
        telegramId?: string | number | bigint;
        type: 'IMAGE' | 'VIDEO';
        scale: number;
        status: 'COMPLETED' | 'FAILED';
        inputResolution?: string;
        outputResolution?: string;
        inputSize?: number;
        outputSize?: number;
        processingTimeSeconds?: number;
        errorMessage?: string;
    }): Promise<string>;
    static getUserUsageSummary(userId: string, plan: UserPlan): Promise<{
        plan: UserPlan;
        imagesUsed: number;
        imagesMax: number;
        imagesRemaining: number;
        videosUsed: number;
        videosMax: number;
        videosRemaining: number;
        date: string;
    }>;
}
export default UsageService;
