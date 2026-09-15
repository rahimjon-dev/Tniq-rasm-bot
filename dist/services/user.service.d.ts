import { UserPlan } from '../types/user.types.js';
export declare class UserService {
    static getUserLanguage(telegramId: number | bigint): Promise<string | null>;
    static setUserLanguage(telegramId: number | bigint, languageCode: string): Promise<void>;
    static findOrCreateUser(params: {
        telegramId: number | bigint;
        username?: string;
        firstName?: string;
        languageCode?: string;
    }): Promise<({
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
    }) | {
        id: string;
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        languageCode: string | null;
        isBanned: boolean;
        createdAt: Date;
        updatedAt: Date;
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
    }>;
    static getUserPlan(telegramId: number | bigint): Promise<UserPlan>;
    static getUserHistory(userId: string, limit?: number): Promise<{
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
    static getUserTotalJobsCount(userId: string): Promise<number>;
    static upgradeUserSubscription(userId: string, plan: UserPlan, durationDays?: number): Promise<void>;
}
export default UserService;
