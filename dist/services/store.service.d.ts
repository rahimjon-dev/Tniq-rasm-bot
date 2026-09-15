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
    private data;
    private saveTimeout;
    constructor();
    private loadData;
    private saveToDisk;
    saveUser(params: {
        telegramId: number | bigint;
        username?: string | null;
        firstName?: string | null;
        languageCode?: string | null;
        plan?: UserPlan;
    }): StoredUser;
    getUser(telegramId: number | bigint): StoredUser | null;
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
    setUserBan(telegramId: number | bigint, isBanned: boolean): boolean;
    setUserPlan(telegramId: number | bigint, plan: UserPlan): boolean;
    getAllActiveTelegramIds(): number[];
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
