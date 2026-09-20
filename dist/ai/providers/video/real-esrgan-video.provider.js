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
    async fallbackFfmpegUpscale(inputPath, outputPath, scale, targetResolution, startTime, meta) {
        logger.info(`[AI_VIDEO] Running FFmpeg Ultra-Clarity 4K Pipeline (target: ${targetResolution || scale + 'x'})...`);
        await FFmpegService.upscaleDirect({
            inputPath,
            outputPath,
            scale,
            targetResolution,
            fps: meta.fps,
        });
        const outMeta = await FFmpegService.getMetadata(outputPath);
        const outStat = await fs.promises.stat(outputPath);
        const durationSeconds = (Date.now() - startTime) / 1000;
        logger.info(`[AI_VIDEO] 4K Video upscale complete in ${durationSeconds.toFixed(1)}s: ${outMeta.width}x${outMeta.height}`);
        return {
            outputPath,
            originalResolution: `${meta.width}x${meta.height}`,
            outputResolution: `${outMeta.width}x${outMeta.height}`,
            fps: outMeta.fps,
            durationSeconds: meta.durationSeconds,
            outputSizeBytes: outStat.size,
            processingTimeSeconds: durationSeconds,
            provider: 'ffmpeg-ultra-4k-hq',
            modelUsed: 'Lanczos3 CAS Ultra-Clarity 4K Pipeline',
        };
    }
    async upscaleVideo(inputPath, outputPath, options) {
        const startTime = Date.now();
        const uniqueSession = crypto.randomBytes(6).toString('hex');
        // Working directory for frames and audio
        const workDir = path.join(config.paths.tempStorage, `vid_work_${uniqueSession}`);
        try {
            // 1. Inspect Source Video Metadata
            const meta = await FFmpegService.getMetadata(inputPath);
            logger.info(`[AI_VIDEO] Metadata inspected: ${meta.width}x${meta.height}, ${meta.fps} FPS, ${meta.durationSeconds.toFixed(1)}s, ${meta.totalFrames} frames`);
            let scale = options.scale || 2;
            const targetResolution = options.targetResolution;
            logger.info(`[AI_VIDEO] Processing video with Ultra-Clarity 4K Pipeline (target=${targetResolution || '4K'})...`);
            return await this.fallbackFfmpegUpscale(inputPath, outputPath, scale, targetResolution, startTime, meta);
        }
        catch (err) {
            logger.warn(`[AI_VIDEO] High-fidelity video pipeline notice: ${err.message}`);
            throw err;
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