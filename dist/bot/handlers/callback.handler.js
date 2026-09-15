import path from 'path';
import crypto from 'crypto';
import config from '../../config/index.js';
import { pendingImageUploads } from './image.handler.js';
import { pendingVideoUploads } from './video.handler.js';
import { enqueueImageJob } from '../../queue/queues/image.queue.js';
import { enqueueVideoJob } from '../../queue/queues/video.queue.js';
import ImageService from '../../services/media/image.service.js';
import { getT } from '../../i18n/index.js';
export async function handleScaleSelection(ctx, scale) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const pending = pendingImageUploads.get(telegramId);
    if (!pending) {
        await ctx.answerCbQuery('⏳ Qabul qilingan, ishlanmoqda...');
        return;
    }
    await ctx.answerCbQuery();
    const lang = pending.language || 'uz';
    const t = getT(lang);
    // Remove from pending map
    pendingImageUploads.delete(telegramId);
    const jobId = crypto.randomUUID();
    const outputFileName = `upscaled_${jobId}_${scale}x.jpg`;
    const outputFilePath = path.join(config.paths.outputStorage, outputFileName);
    await ctx.editMessageText(t.queued_image(jobId, scale, pending.originalWidth, pending.originalHeight), { parse_mode: 'HTML' });
    // Enqueue job for background worker
    await enqueueImageJob({
        jobId,
        userId: pending.userId,
        telegramChatId: telegramId,
        inputFilePath: pending.filePath,
        outputFilePath,
        scale,
        language: lang,
        createdAt: new Date().toISOString(),
    });
}
export async function handleVideoResolutionSelection(ctx, resolution) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const pending = pendingVideoUploads.get(telegramId);
    if (!pending) {
        await ctx.answerCbQuery('⏳ Qabul qilingan, ishlanmoqda...');
        return;
    }
    await ctx.answerCbQuery();
    const lang = pending.language || 'uz';
    const t = getT(lang);
    pendingVideoUploads.delete(telegramId);
    const jobId = crypto.randomUUID();
    const outputFileName = `video_${jobId}_${resolution}.mp4`;
    const outputFilePath = path.join(config.paths.outputStorage, outputFileName);
    // Calculate scale
    let scale = 2;
    if (resolution === '4K' || (pending.originalWidth < 720 && resolution === '1080p')) {
        scale = 4;
    }
    await ctx.editMessageText(t.queued_video(jobId, resolution, scale, pending.durationSeconds, pending.fps), { parse_mode: 'HTML' });
    await enqueueVideoJob({
        jobId,
        userId: pending.userId,
        telegramChatId: telegramId,
        inputFilePath: pending.filePath,
        outputFilePath,
        targetResolution: resolution,
        scale,
        language: lang,
        createdAt: new Date().toISOString(),
    });
}
export async function handleCancelAction(ctx) {
    const telegramId = ctx.from?.id;
    if (telegramId) {
        const pendingImg = pendingImageUploads.get(telegramId);
        if (pendingImg) {
            await ImageService.safeDelete(pendingImg.filePath);
            pendingImageUploads.delete(telegramId);
        }
        const pendingVid = pendingVideoUploads.get(telegramId);
        if (pendingVid) {
            await ImageService.safeDelete(pendingVid.filePath);
            pendingVideoUploads.delete(telegramId);
        }
    }
    await ctx.answerCbQuery('Bekor qilindi');
    try {
        await ctx.deleteMessage();
    }
    catch { }
}
//# sourceMappingURL=callback.handler.js.map