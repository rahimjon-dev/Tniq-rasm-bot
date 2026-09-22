import { UserPlan } from '../types/user.types.js';
export declare class UserService {
    static getUserLanguage(telegramId: number | bigint): Promise<string | null>;
    static setUserLanguage(telegramId: number | bigint, languageCode: string): Promise<void>;
    static findOrCreateUser(params: {
        telegramId: number | bigint;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        languageCode?: string | null;
        lastAction?: string | null;
        isExplicitLanguageChange?: boolean;
    }): Promise<{
        id: string;
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
        isBanned: boolean;
        createdAt: Date;
        updatedAt: Date;
        plan: UserPlan;
        subscription: {
            id: string;
            userId: string;
            plan: UserPlan;
            status: string;
            startDate: Date;
            endDate: null;
            createdAt: Date;
            updatedAt: Date;
        };
    } | {
        plan: UserPlan;
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
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        languageCode: string | null;
        isBanned: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastName?: undefined;
    }>;
    static setUserPlan(telegramId: number | bigint | string, plan: UserPlan): Promise<boolean>;
    static upgradeUserSubscription(telegramId: number | bigint | string, plan: UserPlan, durationDays?: number): Promise<boolean>;
    static getUserTotalJobsCount(userId: string): Promise<number>;
    static getUserHistory(userId: string, limit?: number): Promise<import("./store.service.js").StoredJob[] | {
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
    }[]>;
    static updateActivity(telegramId: number | bigint | string, action: string): void;
    static setUserCustomBackground(telegramId: number | bigint | string, backgroundPath: string | null): boolean;
    static getUserCustomBackground(telegramId: number | bigint | string): string | null;
}
export default UserService;
