import { Context } from 'telegraf';
export declare function acquireUserJobLock(userId: string): boolean;
export declare function releaseUserJobLock(userId: string): void;
export declare function rateLimitMiddleware(ctx: Context, next: () => Promise<void>): Promise<void>;
