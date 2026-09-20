import fs from 'fs';
import { Worker } from 'bullmq';
import { redisConnection } from '../queue.client.js';
import { getVideoUpscalerProvider } from '../../ai/providers/video/index.js';
import UsageService from '../../services/usage.service.js';
import { bot } from '../../bot/bot.instance.js';
import logger from '../../utils/logger.js';
import { getT } from '../../i18n/index.js';
import { sendReviewInvitation } from '../../bot/handlers/review.handler.js';
export async function processVideoJob(payload) {
    const { jobId, userId, telegramChatId, inputFilePath, outputFilePath, targetResolution, scale } = payload;
    const startTime = Date.now();
    let statusMsgId;
    const t = getT(payload.language);
    try {
        // 1. Stage 1: Preparing
        const sent = await bot.telegram.sendMessage(telegramChatId, t.stage_preparing, { parse_mode: 'HTML' });
        statusMsgId = sent.message_id;
        // 2. Stage 2: Generating
        try {
            await bot.telegram.editMessageText(telegramChatId, statusMsgId, undefined, t.stage_generating(targetResolution), { parse_mode: 'HTML' });
        }
        catch { }
        // Execute AI Video Pipeline
        const provider = getVideoUpscalerProvider();
        const result = await provider.upscaleVideo(inputFilePath, outputFilePath, {
            targetResolution,
            scale,
        });
        // 3. Stage 3: Uploading
        try {
            await bot.telegram.editMessageText(telegramChatId, statusMsgId, undefined, t.stage_uploading, { parse_mode: 'HTML' });
        }
        catch { }
        // 4. Deliver Enhanced Video
        const inputSize = fs.existsSync(inputFilePath) ? (await fs.promises.stat(inputFilePath)).size : 0;
        // 4. Deliver Enhanced Video
        const duration = (Date.now() - startTime) / 1000;
        const caption = t.complete_video(targetResolution, duration);
        // Verify output file size against Telegram Bot 50MB limit
        const outStat = fs.existsSync(outputFilePath) ? await fs.promises.stat(outputFilePath) : null;
        const finalSize = outStat ? outStat.size : result.outputSizeBytes;
        // Send as streamable Telegram video
        try {
            await bot.telegram.sendVideo(telegramChatId, { source: outputFilePath }, {
                caption,
                parse_mode: 'HTML',
                supports_streaming: true,
            });
        }
        catch (videoSendErr) {
            logger.warn(`[VIDEO_WORKER] sendVideo notice: ${videoSendErr.message}, delivering as Document.`);
        }
        // Send as uncompressed document if under 50MB
        if (finalSize < 49.5 * 1024 * 1024) {
            try {
                await bot.telegram.sendDocument(telegramChatId, { source: outputFilePath, filename: `upscaled_${targetResolution}_${result.outputResolution}.mp4` }, { caption: t.doc_video_caption, parse_mode: 'HTML' });
            }
            catch (docSendErr) {
                logger.warn(`[VIDEO_WORKER] sendDocument notice: ${docSendErr.message}`);
            }
        }
        // Send interactive 1-5 star review invitation
        setTimeout(() => {
            sendReviewInvitation(telegramChatId, payload.language).catch(() => { });
        }, 1200);
        // Clean up status message
        if (statusMsgId) {
            try {
                await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
            }
            catch { }
        }
        // 5. Update Database Records
        await Promise.all([
            UsageService.incrementVideoUsage(userId, telegramChatId),
            UsageService.recordJob({
                userId,
                telegramId: telegramChatId,
                type: 'VIDEO',
                scale,
                status: 'COMPLETED',
                inputResolution: result.originalResolution,
                outputResolution: result.outputResolution,
                inputSize,
                outputSize: finalSize,
                processingTimeSeconds: duration,
            }),
        ]);
        logger.info(`[VIDEO_JOB_COMPLETED] Job=${jobId} User=${userId} Res=${targetResolution} Duration=${duration.toFixed(2)}s`);
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[VIDEO_JOB_FAILED] Job=${jobId}:`, { error: errorMsg });
        UsageService.releaseVideoReservation(telegramChatId);
        if (statusMsgId) {
            try {
                await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
            }
            catch { }
        }
        await bot.telegram.sendMessage(telegramChatId, t.process_video_error(errorMsg), { parse_mode: 'HTML' });
        await UsageService.recordJob({
            userId,
            telegramId: telegramChatId,
            type: 'VIDEO',
            scale,
            status: 'FAILED',
        });
    }
    finally {
        // Strict Cleanup of temporary inputs and outputs
        try {
            if (fs.existsSync(inputFilePath))
                fs.unlinkSync(inputFilePath);
        }
        catch { }
    }
}
export let videoWorker;
export function startVideoWorker(connection = redisConnection) {
    videoWorker = new Worker('video-upscale', async (job) => {
        logger.info(`[VIDEO_WORKER] Processing job: ${job.id}`);
        await processVideoJob(job.data);
    }, {
        connection,
        concurrency: 2,
    });
    videoWorker.on('completed', (job) => {
        logger.debug(`[VIDEO_WORKER] Job completed successfully: ${job.id}`);
    });
    videoWorker.on('failed', (job, err) => {
        logger.error(`[VIDEO_WORKER] Job failed: ${job?.id}`, { error: err.message });
    });
    return videoWorker;
}
export default startVideoWorker;
//# sourceMappingURL=video.worker.js.map