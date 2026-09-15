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
     * Utilizes CLAHE adaptive histogram equalization, Lanczos3 supersampling,
     * and dual-pass unsharp masking to dramatically sharpen details and remove blur.
     */
    private fallbackSharpUpscale;
    upscaleImage(inputPath: string, outputPath: string, options: ImageUpscaleOptions): Promise<ImageUpscaleResult>;
}
export default RealESRGANLocalProvider;
