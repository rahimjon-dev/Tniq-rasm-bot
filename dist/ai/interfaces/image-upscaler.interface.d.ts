export interface ImageUpscaleOptions {
    scale: 2 | 4;
    format?: 'jpg' | 'png' | 'webp';
    denoiseLevel?: number;
    faceEnhance?: boolean;
}
export interface ImageUpscaleResult {
    outputPath: string;
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    processingTimeSeconds: number;
    provider: string;
    modelUsed: string;
}
export interface ImageUpscalerProvider {
    readonly name: string;
    isAvailable(): Promise<boolean>;
    upscaleImage(inputPath: string, outputPath: string, options: ImageUpscaleOptions): Promise<ImageUpscaleResult>;
}
