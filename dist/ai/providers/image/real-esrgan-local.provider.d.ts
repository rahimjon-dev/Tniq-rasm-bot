import { ImageUpscalerProvider, ImageUpscaleOptions, ImageUpscaleResult } from '../../interfaces/image-upscaler.interface.js';
export declare class RealESRGANLocalProvider implements ImageUpscalerProvider {
    readonly name = "real-esrgan-local";
    private readonly exePath;
    private readonly modelsDir;
    constructor();
    isAvailable(): Promise<boolean>;
    upscaleImage(inputPath: string, outputPath: string, options: ImageUpscaleOptions): Promise<ImageUpscaleResult>;
}
export default RealESRGANLocalProvider;
