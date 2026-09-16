import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
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
     * Directly upscale video using high-quality Lanczos scaling and unsharp filter
     * without exploding into individual disk frames
     */
    static async upscaleDirect(params) {
        const { inputPath, outputPath, scale, crf = 18 } = params;
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // Advanced video filter chain:
        // 1. hqdn3d: Removes input sensor/compression noise before upscaling
        // 2. scale: Lanczos + accurate rounding + full chroma interpolation
        // 3. cas: AMD Contrast Adaptive Sharpening recovers fine textures and edge contrast
        const filter = `hqdn3d=1.2:1.2:3:3,scale=iw*${scale}:ih*${scale}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,cas=0.6`;
        const args = [
            '-y',
            '-i', inputPath,
            '-vf', filter,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'fast',
            '-crf', crf.toString(),
            '-c:a', 'copy',
            '-movflags', '+faststart',
            outputPath,
        ];
        await new Promise((resolve, reject) => {
            execFile(this.ffmpegExe, args, { timeout: 300000 }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`FFmpeg direct upscale failed: ${error.message}`));
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