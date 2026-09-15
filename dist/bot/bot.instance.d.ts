import { Telegraf, Context } from 'telegraf';
export declare const bot: Telegraf<Context<import("@telegraf/types").Update>>;
export declare function registerBotCommands(): Promise<void>;
