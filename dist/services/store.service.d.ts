import { UserPlan } from '../types/user.types.js';
export interface StoredUser {
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
    processingTime?: number;
    createdAt: string;
}
declare class StoreService {
    private dbPath;
    private backupPath;
    private data;
    private saveTimeout;
    private isShuttingDown;
    constructor();
    private loadData;
    /**
     * Synchronously and atomically flushes all current in-memory state to disk
     * Writes to a temporary file first, then atomically renames to prevent corruption.
     */
    flushSync(): void;
    private saveToDisk;
    isUserBanned(telegramId: number | bigint | string): boolean;
    setUserBan(telegramId: number | bigint | string, isBanned: boolean): boolean;
    saveUser(params: {
        telegramId: number | bigint | string;
        username?: string | null;
        firstName?: string | null;
        languageCode?: string | null;
        plan?: UserPlan;
    }): StoredUser;
    getUser(telegramId: number | bigint | string): StoredUser | null;
    getAllUsers(query?: string, page?: number, limit?: number): {
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
    };
    setUserPlan(telegramId: number | bigint | string, plan: UserPlan): boolean;
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
    }): void;
    getRecentJobs(limit?: number): {
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
    }[];
    getStats(): {
        totalUsers: number;
        totalJobs: number;
        imageJobs: number;
        videoJobs: number;
        failedJobs: number;
        successRatePercent: number;
    };
}
export declare const store: StoreService;
export default store;
