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
            // Calculate scale factor according to target resolution
            // Target options: '720p' | '1080p' | '2K' | '4K'
            let scale = options.scale || 2;
            if (options.targetResolution === '4K' || (meta.width < 720 && options.targetResolution === '1080p')) {
                scale = 4;
            }
            fs.mkdirSync(inputFramesDir, { recursive: true });
            fs.mkdirSync(outputFramesDir, { recursive: true });
            // 2. Extract Audio Stream
            const hasAudio = await FFmpegService.extractAudio(inputPath, tempAudioPath);
            logger.info(`[AI_VIDEO] Audio extraction completed: hasAudio=${hasAudio}`);
            // 3. Extract Video Frames
            const frameCount = await FFmpegService.extractFrames(inputPath, inputFramesDir, meta.fps);
            logger.info(`[AI_VIDEO] Extracted ${frameCount} frames for AI batch enhancement`);
            if (frameCount === 0) {
                throw new Error('No frames were extracted from video.');
            }
            // 4. Batch Super-Resolution on Frames Directory via Real-ESRGAN
            // Real-ESRGAN accepts directory input (-i) and directory output (-o)
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
            await new Promise((resolve, reject) => {
                execFile(this.exePath, args, { timeout: 900000 }, (error, stdout, stderr) => {
                    if (error) {
                        logger.error('[AI_VIDEO] Frame upscaling failed:', { error: error.message, stderr });
                        return reject(new Error(`AI video upscaling failed: ${error.message}`));
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
            // 6. Inspect Generated Video for Final Metrics
            const outMeta = await FFmpegService.getMetadata(outputPath);
            const outStat = await fs.promises.stat(outputPath);
            const durationSeconds = (Date.now() - startTime) / 1000;
            logger.info(`[AI_VIDEO] Video pipeline complete in ${durationSeconds.toFixed(1)}s: ${outMeta.width}x${outMeta.height}`);
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
        finally {
            // 7. Thorough Cleanup: Delete all extracted frame images and temp audio
            try {
                if (fs.existsSync(workDir)) {
                    await fs.promises.rm(workDir, { recursive: true, force: true });
                    logger.debug(`Cleaned up temp video working directory: ${workDir}`);
                }
            }
            catch (err) {
                logger.warn('Failed to clean video work directory:', err);
            }
        }
    }
}
export default RealESRGANVideoProvider;
//# sourceMappingURL=real-esrgan-video.provider.js.map