import { VideoMetadata } from '../../ai/interfaces/video-upscaler.interface.js';
export declare class FFmpegService {
    private static readonly ffmpegExe;
    private static readonly ffprobeExe;
    /**
     * Run FFprobe to extract deep metadata from video file
     */
    static getMetadata(filePath: string): Promise<VideoMetadata>;
    static probeVideo(filePath: string): Promise<VideoMetadata>;
    /**
     * Extract audio stream without re-encoding to guarantee 100% audio fidelity
     */
    static extractAudio(videoPath: string, audioOutputPath: string): Promise<boolean>;
    /**
     * Extract video frames into target directory as sequential JPG files
     */
    static extractFrames(videoPath: string, outputFramesDir: string, fps?: number): Promise<number>;
    /**
     * Reconstruct video from upscaled frames with synchronized audio
     */
    static muxFramesAndAudio(params: {
        framesDir: string;
        audioPath?: string;
        fps: number;
        outputPath: string;
        crf?: number;
    }): Promise<void>;
    /**
     * Directly upscale video using high-quality Lanczos scaling and unsharp filter
     * without exploding into individual disk frames
     */
    static upscaleDirect(params: {
        inputPath: string;
        outputPath: string;
        scale: number;
        fps?: number;
        crf?: number;
    }): Promise<void>;
}
export default FFmpegService;
