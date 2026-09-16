import { Context } from 'telegraf';
export declare const awaitingProBackgroundUsers: Set<number>;
export declare function handleProCustomBackgroundCommand(ctx: Context): Promise<void>;
export declare function handleResetCustomBackground(ctx: Context): Promise<void>;
export declare function checkAndProcessProBackgroundUpload(ctx: Context): Promise<boolean>;
