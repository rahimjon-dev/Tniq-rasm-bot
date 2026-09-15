import { ImageUpscalerProvider, ImageUpscaleOptions, ImageUpscaleResult } from '../../interfaces/image-upscaler.interface.js';
export declare class RealESRGANLocalProvider implements ImageUpscalerProvider {
    readonly name = "real-esrgan-local";
    private readonly exePath;
    private readonly modelsDir;
    constructor();
    private getExecutablePath;
    private getModelsDirectory;
    isAvailable(): Promise<boolean>;
    /**
     * Ultra-Clarity Multi-Pass Filter Engine
     * Eliminates blurriness using high-order Lanczos3 supersampling,
     * full dynamic range contrast normalization, and high-frequency edge crisping.
     */
    private fallbackSharpUpscale;
    upscaleImage(inputPath: string, outputPath: string, options: ImageUpscaleOptions): Promise<ImageUpscaleResult>;
}
export default RealESRGANLocalProvider;
