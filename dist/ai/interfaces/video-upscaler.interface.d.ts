export interface VideoMetadata {
    width: number;
    height: number;
    durationSeconds: number;
    fps: number;
    totalFrames: number;
    videoCodec: string;
    audioCodec?: string;
    hasAudio: boolean;
    bitrateKbps: number;
}
export interface VideoUpscaleOptions {
    targetResolution: '720p' | '1080p' | '2K' | '4K';
    scale: number;
    preserveFps?: boolean;
    targetFps?: number;
    crf?: number;
    onProgress?: (progress: {
        currentFrame: number;
        totalFrames: number;
        percent: number;
    }) => void;
}
export interface VideoUpscaleResult {
    outputPath: string;
    originalResolution: string;
    outputResolution: string;
    fps: number;
    durationSeconds: number;
    outputSizeBytes: number;
    processingTimeSeconds: number;
    provider: string;
    modelUsed: string;
}
export interface VideoUpscalerProvider {
    readonly name: string;
    isAvailable(): Promise<boolean>;
    upscaleVideo(inputPath: string, outputPath: string, options: VideoUpscaleOptions): Promise<VideoUpscaleResult>;
}
