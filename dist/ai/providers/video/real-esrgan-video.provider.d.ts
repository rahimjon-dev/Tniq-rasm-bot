import { VideoUpscalerProvider, VideoUpscaleOptions, VideoUpscaleResult } from '../../interfaces/video-upscaler.interface.js';
export declare class RealESRGANVideoProvider implements VideoUpscalerProvider {
    readonly name = "real-esrgan-video-local";
    private readonly exePath;
    private readonly modelsDir;
    constructor();
    isAvailable(): Promise<boolean>;
    upscaleVideo(inputPath: string, outputPath: string, options: VideoUpscaleOptions): Promise<VideoUpscaleResult>;
}
export default RealESRGANVideoProvider;
