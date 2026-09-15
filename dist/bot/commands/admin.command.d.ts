import { Context, Markup } from 'telegraf';
export declare const adminKeyboard: Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
export declare function handleAdminCommand(ctx: Context): Promise<void>;
export declare function handleStatsCommand(ctx: Context): Promise<void>;
export declare function handleBroadcastCommand(ctx: Context): Promise<void>;
export declare function handleBanCommand(ctx: Context): Promise<void>;
export declare function handleUnbanCommand(ctx: Context): Promise<void>;
export declare function handleSetPlanCommand(ctx: Context): Promise<void>;
