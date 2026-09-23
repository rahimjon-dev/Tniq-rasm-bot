import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';
// @ts-ignore
import ffprobePath from 'ffprobe-static';
import logger from '../../utils/logger.js';
export class FFmpegService {
    static ffmpegExe = ffmpegPath?.default || ffmpegPath;
    static ffprobeExe = ffprobePath?.path || ffprobePath;
    /**
     * Run FFprobe to extract deep metadata from video file
     */
    static async getMetadata(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Video file not found at: ${filePath}`);
        }
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath,
        ];
        const jsonOutput = await new Promise((resolve, reject) => {
            execFile(this.ffprobeExe, args, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`FFprobe failed: ${error.message} - ${stderr}`));
                }
                resolve(stdout);
            });
        });
        const parsed = JSON.parse(jsonOutput);
        const videoStream = parsed.streams?.find((s) => s.codec_type === 'video');
        const audioStream = parsed.streams?.find((s) => s.codec_type === 'audio');
        if (!videoStream) {
            throw new Error('No valid video stream found in the provided file.');
        }
        const width = parseInt(videoStream.width, 10) || 0;
        const height = parseInt(videoStream.height, 10) || 0;
        // Calculate FPS from rational string (e.g. "30/1" or "30000/1001")
        let fps = 30;
        if (videoStream.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/');
            if (parts.length === 2 && parseFloat(parts[1]) > 0) {
                fps = Math.round((parseFloat(parts[0]) / parseFloat(parts[1])) * 100) / 100;
            }
        }
        const durationSeconds = parseFloat(videoStream.duration || parsed.format?.duration || '0') || 0;
        const totalFrames = parseInt(videoStream.nb_frames, 10) || Math.round(durationSeconds * fps) || 0;
        const bitrateKbps = Math.round((parseInt(parsed.format?.bit_rate || videoStream.bit_rate || '0', 10)) / 1000);
        return {
            width,
            height,
            durationSeconds,
            fps,
            totalFrames,
            videoCodec: videoStream.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name,
            hasAudio: !!audioStream,
            bitrateKbps,
        };
    }
    static async probeVideo(filePath) {
        return this.getMetadata(filePath);
    }
    /**
     * Extract audio stream without re-encoding to guarantee 100% audio fidelity
     */
    static async extractAudio(videoPath, audioOutputPath) {
        const dir = path.dirname(audioOutputPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        // Use aac/m4a container for copied stream
        const args = [
            '-y',
            '-i', videoPath,
            '-vn',
            '-c:a', 'copy',
            audioOutputPath,
        ];
        return new Promise((resolve) => {
            execFile(this.ffmpegExe, args, { timeout: 30000 }, (err) => {
                if (err || !fs.existsSync(audioOutputPath) || fs.statSync(audioOutputPath).size === 0) {
                    logger.debug('Video does not have a copyable audio track or audio extraction failed');
                    resolve(false);
                }
                else {
                    resolve(true);
                }
            });
        });
    }
    /**
     * Extract video frames into target directory as sequential JPG files
     */
    static async extractFrames(videoPath, outputFramesDir, fps) {
        if (!fs.existsSync(outputFramesDir)) {
            fs.mkdirSync(outputFramesDir, { recursive: true });
        }
        const framePattern = path.join(outputFramesDir, 'frame_%06d.jpg');
        const args = ['-y', '-i', videoPath];
        if (fps) {
            args.push('-r', fps.toString());
        }
        // High quality JPEG frames (q:v 2) for optimal AI processing speed and detail
        args.push('-q:v', '2', framePattern);
        await new Promise((resolve, reject) => {
            execFile(this.ffmpegExe, args, { timeout: 300000 }, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(`Frame extraction failed: ${err.message} - ${stderr}`));
                }
                resolve();
            });
        });
        const files = await fs.promises.readdir(outputFramesDir);
        return files.filter((f) => f.startsWith('frame_') && f.endsWith('.jpg')).length;
    }
    /**
     * Reconstruct video from upscaled frames with synchronized audio
     */
    static async muxFramesAndAudio(params) {
        const { framesDir, audioPath, fps, outputPath, crf = 20 } = params;
        const outDir = path.dirname(outputPath);
        if (!fs.existsSync(outDir))
            fs.mkdirSync(outDir, { recursive: true });
        const framePattern = path.join(framesDir, 'frame_%06d.jpg');
        const args = [
            '-y',
            '-framerate', fps.toString(),
            '-i', framePattern,
        ];
        const hasAudio = audioPath && fs.existsSync(audioPath);
        if (hasAudio) {
            args.push('-i', audioPath);
        }
        // H.264 video encoding with faststart for web/Telegram streaming
        args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', crf.toString(), '-preset', 'medium', '-movflags', '+faststart');
        if (hasAudio) {
            args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
        }
        args.push(outputPath);
        await new Promise((resolve, reject) => {
            execFile(this.ffmpegExe, args, { timeout: 600000 }, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(`Video reconstruction failed: ${err.message} - ${stderr}`));
                }
                resolve();
            });
        });
        if (!fs.existsSync(outputPath)) {
            throw new Error('Video reconstruction completed but output file was not created.');
        }
    }
    /**
     * Directly upscale video using high-quality Lanczos scaling, unsharp masking,
     * Contrast Adaptive Sharpening (CAS), and color dynamic enhancement
     */
    static async upscaleDirect(params) {
        const { inputPath, outputPath, scale = 2, targetResolution, crf = 20 } = params;
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // Determine precise dimension scaling for true 4K/2K/HD:
        // 4K Ultra HD: 3840px on longest dimension
        // 2K Quad HD: 2560px on longest dimension
        // 1080p Full HD: 1920px on longest dimension
        // 720p HD: 1280px on longest dimension
        let scaleFilter;
        if (targetResolution === '4K') {
            scaleFilter = "scale='if(gte(iw,ih),3840,trunc(3840*iw/ih/2)*2)':'if(gte(iw,ih),trunc(3840*ih/iw/2)*2,3840)':flags=bicubic";
        }
        else if (targetResolution === '2K') {
            scaleFilter = "scale='if(gte(iw,ih),2560,trunc(2560*iw/ih/2)*2)':'if(gte(iw,ih),trunc(2560*ih/iw/2)*2,2560)':flags=bicubic";
        }
        else if (targetResolution === '1080p') {
            scaleFilter = "scale='if(gte(iw,ih),1920,trunc(1920*iw/ih/2)*2)':'if(gte(iw,ih),trunc(1920*ih/iw/2)*2,1920)':flags=bicubic";
        }
        else if (targetResolution === '720p') {
            scaleFilter = "scale='if(gte(iw,ih),1280,trunc(1280*iw/ih/2)*2)':'if(gte(iw,ih),trunc(1280*ih/iw/2)*2,1280)':flags=bicubic";
        }
        else {
            scaleFilter = `scale=w='trunc(iw*${scale}/2)*2':h='trunc(ih*${scale}/2)*2':flags=bicubic`;
        }
        // High-performance ultra-clarity video filter:
        // 1. Clean bicubic scaling to true 4K/2K (avoids massive 36-tap CPU stall)
        // 2. Optimized 3x3 unsharp filter for crisp facial and landscape contours
        // 3. Dynamic color & contrast pop (+5% contrast, +6% saturation)
        const filter = `${scaleFilter},unsharp=3:3:1.0:3:3:0.0,eq=contrast=1.05:brightness=0.01:saturation=1.06`;
        // Multi-core thread acceleration: uses available CPU cores (up to 8)
        const cpuThreads = Math.max(2, Math.min(os.cpus()?.length || 4, 8)).toString();
        const effectiveCrf = crf ? Math.max(crf, 22).toString() : '22';
        const maxBitrate = targetResolution === '4K' ? '8M' : '6M';
        const bufSize = targetResolution === '4K' ? '16M' : '12M';
        const preset = 'veryfast';
        const args = [
            '-y',
            '-i', inputPath,
            '-vf', filter,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', preset,
            '-threads', cpuThreads,
            '-crf', effectiveCrf,
            '-maxrate', maxBitrate,
            '-bufsize', bufSize,
            '-c:a', 'copy',
            '-movflags', '+faststart',
            outputPath,
        ];
        await new Promise((resolve, reject) => {
            execFile(this.ffmpegExe, args, { timeout: 180000 }, (error, stdout, stderr) => {
                if (error) {
                    // If -c:a copy failed because of audio track container issues, retry with AAC re-encode
                    const fallbackArgs = [
                        '-y',
                        '-i', inputPath,
                        '-vf', filter,
                        '-c:v', 'libx264',
                        '-pix_fmt', 'yuv420p',
                        '-preset', preset,
                        '-threads', cpuThreads,
                        '-crf', effectiveCrf,
                        '-maxrate', maxBitrate,
                        '-bufsize', bufSize,
                        '-c:a', 'aac',
                        '-b:a', '192k',
                        '-movflags', '+faststart',
                        outputPath,
                    ];
                    execFile(this.ffmpegExe, fallbackArgs, { timeout: 180000 }, (fallbackErr) => {
                        if (fallbackErr) {
                            return reject(new Error(`FFmpeg direct upscale failed: ${fallbackErr.message}`));
                        }
                        resolve();
                    });
                    return;
                }
                resolve();
            });
        });
        if (!fs.existsSync(outputPath)) {
            throw new Error('Video upscale completed but output file was not produced.');
        }
    }
}
export default FFmpegService;
//# sourceMappingURL=ffmpeg.service.js.map