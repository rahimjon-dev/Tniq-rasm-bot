export type JobType = 'IMAGE' | 'VIDEO';
export type JobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export interface ImageJobPayload {
    jobId: string;
    userId: string;
    telegramChatId: number;
    inputFilePath: string;
    outputFilePath: string;
    scale: 2 | 4;
    format?: 'jpg' | 'png' | 'webp';
    language?: string;
    customBackgroundPath?: string | null;
    createdAt: string;
}
export interface VideoJobPayload {
    jobId: string;
    userId: string;
    telegramChatId: number;
    inputFilePath: string;
    outputFilePath: string;
    targetResolution: '720p' | '1080p' | '2K' | '4K';
    scale: number;
    maxFps?: number;
    language?: string;
    createdAt: string;
}
export interface JobProgressUpdate {
    jobId: string;
    status: JobStatus;
    percentage?: number;
    stepDescription: string;
}
