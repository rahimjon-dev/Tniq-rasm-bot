import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../../../config/index.js';
import logger from '../../../utils/logger.js';
import FFmpegService from '../../../services/media/ffmpeg.service.js';
export class RealESRGANVideoProvider {
    name = 'real-esrgan-video-local';
    exePath;
    modelsDir;
    constructor() {
        this.exePath = config.paths.realEsrganExe;
        this.modelsDir = config.paths.realEsrganModels;
    }
    async isAvailable() {
        try {
            return fs.existsSync(this.exePath) && fs.existsSync(this.modelsDir);
        }
        catch {
            return false;
        }
    }
    async fallbackFfmpegUpscale(inputPath, outputPath, scale, startTime, meta) {
        logger.info(`[AI_VIDEO] Running FFmpeg Lanczos High-Fidelity Video Pipeline...`);
        await FFmpegService.upscaleDirect({
            inputPath,
            outputPath,
            scale,
            fps: meta.fps,
        });
        const outMeta = await FFmpegService.getMetadata(outputPath);
        const outStat = await fs.promises.stat(outputPath);
        const durationSeconds = (Date.now() - startTime) / 1000;
        logger.info(`[AI_VIDEO] Video upscale complete in ${durationSeconds.toFixed(1)}s: ${outMeta.width}x${outMeta.height}`);
        return {
            outputPath,
            originalResolution: `${meta.width}x${meta.height}`,
            outputResolution: `${outMeta.width}x${outMeta.height}`,
            fps: outMeta.fps,
            durationSeconds: meta.durationSeconds,
            outputSizeBytes: outStat.size,
            processingTimeSeconds: durationSeconds,
            provider: 'ffmpeg-lanczos-hq',
            modelUsed: 'FFmpeg Lanczos HQ Filter',
        };
    }
    async upscaleVideo(inputPath, outputPath, options) {
        const startTime = Date.now();
        const uniqueSession = crypto.randomBytes(6).toString('hex');
        // Working directory for frames and audio
        const workDir = path.join(config.paths.tempStorage, `vid_work_${uniqueSession}`);
        const inputFramesDir = path.join(workDir, 'frames_in');
        const outputFramesDir = path.join(workDir, 'frames_out');
        const tempAudioPath = path.join(workDir, 'audio.aac');
        try {
            // 1. Inspect Source Video Metadata
            const meta = await FFmpegService.getMetadata(inputPath);
            logger.info(`[AI_VIDEO] Metadata inspected: ${meta.width}x${meta.height}, ${meta.fps} FPS, ${meta.durationSeconds.toFixed(1)}s, ${meta.totalFrames} frames`);
            let scale = options.scale || 2;
            if (options.targetResolution === '4K' || (meta.width < 720 && options.targetResolution === '1080p')) {
                scale = 4;
            }
            // Check if Real-ESRGAN binary exists
            const available = await this.isAvailable();
            if (!available) {
                logger.info(`[AI_VIDEO] Real-ESRGAN binary not found at: ${this.exePath}. Using built-in FFmpeg Lanczos High-Fidelity Video Pipeline.`);
                return this.fallbackFfmpegUpscale(inputPath, outputPath, scale, startTime, meta);
            }
            fs.mkdirSync(inputFramesDir, { recursive: true });
            fs.mkdirSync(outputFramesDir, { recursive: true });
            // 2. Extract Audio Stream
            const hasAudio = await FFmpegService.extractAudio(inputPath, tempAudioPath);
            // 3. Extract Video Frames
            const frameCount = await FFmpegService.extractFrames(inputPath, inputFramesDir, meta.fps);
            if (frameCount === 0) {
                throw new Error('No frames were extracted from video.');
            }
            // 4. Batch Super-Resolution on Frames Directory via Real-ESRGAN
            const modelName = 'realesrgan-x4plus';
            const args = [
                '-i', inputFramesDir,
                '-o', outputFramesDir,
                '-n', modelName,
                '-m', this.modelsDir,
                '-s', scale.toString(),
                '-f', 'jpg',
            ];
            logger.info(`[AI_VIDEO] Running Real-ESRGAN neural network on ${frameCount} frames...`);
            try {
                await new Promise((resolve, reject) => {
                    execFile(this.exePath, args, { timeout: 900000 }, (error, stdout, stderr) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve();
                    });
                });
                // 5. Reconstruct Video with Audio Synchronization
                logger.info(`[AI_VIDEO] Reconstructing video with FFmpeg H.264 & syncing audio...`);
                await FFmpegService.muxFramesAndAudio({
                    framesDir: outputFramesDir,
                    audioPath: hasAudio ? tempAudioPath : undefined,
                    fps: meta.fps,
                    outputPath,
                    crf: options.crf || 20,
                });
                const outMeta = await FFmpegService.getMetadata(outputPath);
                const outStat = await fs.promises.stat(outputPath);
                const durationSeconds = (Date.now() - startTime) / 1000;
                return {
                    outputPath,
                    originalResolution: `${meta.width}x${meta.height}`,
                    outputResolution: `${outMeta.width}x${outMeta.height}`,
                    fps: outMeta.fps,
                    durationSeconds: meta.durationSeconds,
                    outputSizeBytes: outStat.size,
                    processingTimeSeconds: durationSeconds,
                    provider: this.name,
                    modelUsed: modelName,
                };
            }
            catch (e) {
                logger.warn(`[AI_VIDEO] Real-ESRGAN frame execution failed (${e.message}), switching to FFmpeg Lanczos direct upscaler.`);
                return this.fallbackFfmpegUpscale(inputPath, outputPath, scale, startTime, meta);
            }
        }
        finally {
            try {
                if (fs.existsSync(workDir)) {
                    await fs.promises.rm(workDir, { recursive: true, force: true });
                }
            }
            catch { }
        }
    }
}
export default RealESRGANVideoProvider;
//# sourceMappingURL=real-esrgan-video.provider.js.map