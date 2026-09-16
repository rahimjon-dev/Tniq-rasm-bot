import { UserPlan } from '../types/user.types.js';
export interface UserDailyUsage {
    date: string;
    images: number;
    videos: number;
}
export interface StoredUser {
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
    dailyUsage: UserDailyUsage;
    totalImages: number;
    totalVideos: number;
    totalJobs: number;
    customBackground: string | null;
    metadata?: Record<string, any>;
}
export interface StoredJob {
    id: string;
    telegramId: string;
    type: 'IMAGE' | 'VIDEO';
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    scale: number;
    targetResolution?: string;
    inputResolution?: string;
    outputResolution?: string;
    inputSize?: number;
    outputSize?: number;
    processingTime?: number;
    createdAt: string;
    user?: {
        telegramId: string;
        firstName?: string | null;
        username?: string | null;
    } | null;
}
declare class StoreService {
    private dbPath;
    private backupPath;
    private data;
    private saveTimeout;
    private isShuttingDown;
    constructor();
    /**
     * Current date formatted in Asia/Tashkent timezone (YYYY-MM-DD)
     */
    getTodayTashkent(): string;
    private loadData;
    /**
     * Synchronously and atomically flushes state across all storage locations:
     * 1. storage/db.json
     * 2. storage/db.backup.json
     * 3. db.json (root fallback)
     */
    flushSync(): void;
    private saveToDisk;
    isUserBanned(telegramId: number | bigint | string): boolean;
    setUserBan(telegramId: number | bigint | string, isBanned: boolean): boolean;
    saveUser(params: {
        telegramId: number | bigint | string;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        languageCode?: string | null;
        plan?: UserPlan;
        lastAction?: string | null;
        isExplicitLanguageChange?: boolean;
    }): StoredUser;
    setUserLanguage(telegramId: number | bigint | string, languageCode: string): boolean;
    updateUserActivity(telegramId: number | bigint | string, action: string): void;
    getUser(telegramId: number | bigint | string): StoredUser | null;
    getAllUsers(query?: string, page?: number, limit?: number, planFilter?: string): {
        users: {
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
            dailyUsage: UserDailyUsage;
            totalImages: number;
            totalVideos: number;
            totalJobs: number;
            customBackground: string | null;
            metadata?: Record<string, any>;
        }[];
        total: number;
        page: number;
        totalPages: number;
    };
    setUserPlan(telegramId: number | bigint | string, plan: UserPlan): boolean;
    resetUserDailyUsage(telegramId: number | bigint | string): boolean;
    setUserCustomBackground(telegramId: number | bigint | string, backgroundPath: string | null): boolean;
    getUserCustomBackground(telegramId: number | bigint | string): string | null;
    incrementUsage(telegramId: number | bigint | string, type: 'IMAGE' | 'VIDEO'): void;
    getAllActiveTelegramIds(): number[];
    syncFromDatabase(dbUsers: any[]): void;
    recordJob(job: {
        telegramId: string | number | bigint;
        type: 'IMAGE' | 'VIDEO';
        status: 'COMPLETED' | 'FAILED';
        scale: number;
        processingTime: number;
        targetResolution?: string;
        inputResolution?: string;
        outputResolution?: string;
        inputSize?: number;
        outputSize?: number;
    }): void;
    getRecentJobs(limit?: number): {
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
    getJobs(params?: {
        query?: string;
        type?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): {
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
    };
    syncJobsFromDatabase(dbJobs: any[]): void;
    /**
     * Detailed metrics for Admin Dashboard
     */
    getDetailedStats(): {
        totalUsers: number;
        activeUsers: number;
        newUsersToday: number;
        imagesToday: number;
        videosToday: number;
        freeUsers: number;
        premiumUsers: number;
        proUsers: number;
        totalImages: number;
        totalVideos: number;
        totalJobs: number;
        failedJobs: number;
        successRatePercent: number;
    };
}
export declare const store: StoreService;
export default store;
