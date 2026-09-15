import fs from 'fs';
import { Worker } from 'bullmq';
import { getImageUpscalerProvider } from '../../ai/providers/image/index.js';
import ImageService from '../../services/media/image.service.js';
import UsageService from '../../services/usage.service.js';
import { bot } from '../../bot/bot.instance.js';
import logger from '../../utils/logger.js';
import { getT } from '../../i18n/index.js';
export async function processImageJob(payload) {
    const { jobId, userId, telegramChatId, inputFilePath, outputFilePath, scale } = payload;
    const startTime = Date.now();
    let statusMsgId;
    const t = getT(payload.language);
    try {
        // 1. Notify user in Telegram
        const sent = await bot.telegram.sendMessage(telegramChatId, t.processing_image(scale), { parse_mode: 'HTML' });
        statusMsgId = sent.message_id;
        // 2. Perform AI Upscale
        const provider = getImageUpscalerProvider();
        const result = await provider.upscaleImage(inputFilePath, outputFilePath, {
            scale,
            format: payload.format || 'jpg',
        });
        // 3. Remove status message
        if (statusMsgId) {
            try {
                await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
            }
            catch { }
        }
        // 4. Send Enhanced Image to User
        const inputSize = fs.existsSync(inputFilePath) ? (await fs.promises.stat(inputFilePath)).size : 0;
        const outputSize = fs.existsSync(outputFilePath) ? (await fs.promises.stat(outputFilePath)).size : 0;
        const duration = (Date.now() - startTime) / 1000;
        const caption = t.complete_image(scale, `${result.originalWidth}x${result.originalHeight}`, `${result.outputWidth}x${result.outputHeight}`, duration);
        // Send as compressed photo for instant viewing
        await bot.telegram.sendPhoto(telegramChatId, { source: outputFilePath }, { caption, parse_mode: 'HTML' });
        // Send as uncompressed document to prevent Telegram lossy re-compression
        await bot.telegram.sendDocument(telegramChatId, { source: outputFilePath, filename: `upscaled_${scale}x_${result.outputWidth}x${result.outputHeight}.jpg` }, { caption: `📁 <i>Asl sifatdagi fayl (100% Full Fidelity)</i>`, parse_mode: 'HTML' });
        // 5. Update Database Records
        await Promise.all([
            UsageService.incrementImageUsage(userId),
            UsageService.recordJob({
                userId,
                telegramId: telegramChatId,
                type: 'IMAGE',
                scale,
                status: 'COMPLETED',
                inputResolution: `${result.originalWidth}x${result.originalHeight}`,
                outputResolution: `${result.outputWidth}x${result.outputHeight}`,
                inputSize,
                outputSize,
                processingTimeSeconds: duration,
            }),
        ]);
        logger.info(`[JOB_COMPLETED] Job=${jobId} User=${userId} Scale=${scale}x Duration=${duration.toFixed(2)}s`);
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[JOB_FAILED] Job=${jobId}:`, { error: errorMsg });
        if (statusMsgId) {
            try {
                await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
            }
            catch { }
        }
        await bot.telegram.sendMessage(telegramChatId, `❌ <b>AI processing encountered an issue:</b>\n<code>${errorMsg}</code>\n\nPlease try again with a different image or contact support.`, { parse_mode: 'HTML' });
        await UsageService.recordJob({
            userId,
            telegramId: telegramChatId,
            type: 'IMAGE',
            scale,
            status: 'FAILED',
            errorMessage: errorMsg,
        });
    }
    finally {
        // 6. Strict Cleanup: remove temp files from disk
        await ImageService.safeDelete(inputFilePath);
        await ImageService.safeDelete(outputFilePath);
    }
}
// BullMQ Worker lifecycle
let imageWorkerInstance = null;
export function startImageWorker(redis) {
    if (imageWorkerInstance)
        return imageWorkerInstance;
    imageWorkerInstance = new Worker('image-upscale', async (job) => {
        logger.info(`[WORKER] Picking up job #${job.id} for user ${job.data.userId}`);
        await processImageJob(job.data);
    }, {
        connection: redis,
        concurrency: 2, // process up to 2 images concurrently on local GPU/CPU
    });
    imageWorkerInstance.on('failed', (job, err) => {
        logger.error(`[WORKER_FAILED] Job #${job?.id} failed:`, err);
    });
    imageWorkerInstance.on('error', (err) => {
        logger.warn('BullMQ image worker Redis error:', err.message);
    });
    return imageWorkerInstance;
}
export async function stopImageWorker() {
    if (imageWorkerInstance) {
        try {
            await imageWorkerInstance.close();
        }
        catch { }
        imageWorkerInstance = null;
    }
}
export const imageWorker = {
    async close() {
        await stopImageWorker();
    },
};
export default imageWorker;
//# sourceMappingURL=image.worker.js.map