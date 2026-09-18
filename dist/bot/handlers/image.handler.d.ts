import { Context } from 'telegraf';
export declare const pendingImageUploads: Map<number, {
    userId: string;
    filePath: string;
    originalWidth: number;
    originalHeight: number;
    language: string;
    timestamp: number;
    customBackgroundPath?: string | null;
}>;
export declare function handleIncomingPhoto(ctx: Context): Promise<void>;
export declare function handleIncomingDocument(ctx: Context): Promise<void>;
