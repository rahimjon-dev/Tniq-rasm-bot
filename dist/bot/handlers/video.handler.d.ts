import { Context } from 'telegraf';
export declare const pendingVideoUploads: Map<number, {
    userId: string;
    filePath: string;
    originalWidth: number;
    originalHeight: number;
    fps: number;
    durationSeconds: number;
    language: string;
    timestamp: number;
}>;
export declare function handleIncomingVideo(ctx: Context): Promise<void>;
