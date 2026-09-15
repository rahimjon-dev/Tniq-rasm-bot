import { Context } from 'telegraf';
export declare function handleScaleSelection(ctx: Context, scale: 2 | 4): Promise<void>;
export declare function handleVideoResolutionSelection(ctx: Context, resolution: '720p' | '1080p' | '2K' | '4K'): Promise<void>;
export declare function handleCancelAction(ctx: Context): Promise<void>;
