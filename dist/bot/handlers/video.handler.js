import path from 'path';
import crypto from 'crypto';
import config from '../../config/index.js';
import UserService from '../../services/user.service.js';
import UsageService from '../../services/usage.service.js';
import ImageService from '../../services/media/image.service.js';
import FFmpegService from '../../services/media/ffmpeg.service.js';
import { getVideoResolutionKeyboard } from '../keyboards/main.keyboard.js';
import { getT } from '../../i18n/index.js';
import logger from '../../utils/logger.js';
export const pendingVideoUploads = new Map();
export async function handleIncomingVideo(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    try {
        // 1. Check User & Video Quota
        const user = await UserService.findOrCreateUser({
            telegramId,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
            languageCode: ctx.from?.language_code,
            lastAction: 'Sent Video',
        });
        const lang = user.languageCode || 'uz';
        const t = getT(lang);
        const quota = await UsageService.canProcessVideo(user.id, telegramId, user.plan);
        if (!quota.allowed) {
            const typeStr = lang === 'ru' ? 'видео' : lang === 'en' ? 'video' : 'video';
            await ctx.replyWithHTML(t.limit_reached(typeStr, quota.maxLimit));
            return;
        }
        // 2. Identify Video Object
        // @ts-ignore
        const video = ctx.message?.video || ctx.message?.video_note || ctx.message?.animation;
        if (!video)
            return;
        // Check Telegram file size limit
        if (video.file_size && video.file_size > config.MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            await ctx.replyWithHTML(`⚠️ <b>Video hajmi juda katta!</b>\n\n` +
                `Bot hozirda maksimal <b>${config.MAX_VIDEO_SIZE_MB}MB</b> gacha bo'lgan videolarni qabul qiladi.`);
            return;
        }
        // Check duration limit
        if (video.duration && video.duration > config.MAX_VIDEO_DURATION_SECONDS) {
            await ctx.replyWithHTML(`⚠️ <b>Video davomiyligi juda uzun!</b>\n\n` +
                `Maksimal ruxsat etilgan davomiylik: <b>${config.MAX_VIDEO_DURATION_SECONDS} soniya</b>.`);
            return;
        }
        const statusMsg = await ctx.reply('⏳ <i>...</i>', { parse_mode: 'HTML' });
        // 3. Download to storage/temp
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const tempInputPath = path.join(config.paths.tempStorage, `video_in_${uniqueId}.mp4`);
        const fileLink = await ctx.telegram.getFileLink(video.file_id);
        await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), tempInputPath);
        // 4. Probe video using FFprobe
        const metadata = await FFmpegService.probeVideo(tempInputPath);
        // 5. Save pending state
        pendingVideoUploads.set(telegramId, {
            userId: user.id,
            filePath: tempInputPath,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            fps: metadata.fps,
            durationSeconds: metadata.durationSeconds,
            language: lang,
            timestamp: Date.now(),
        });
        try {
            await ctx.deleteMessage(statusMsg.message_id);
        }
        catch { }
        // 6. Present Resolution Selection
        await ctx.replyWithHTML(`🎬 <b>Video qabul qilindi!</b>\n\n` +
            `📐 <b>Asl o'lchami:</b> ${metadata.width} × ${metadata.height} px (${metadata.fps} FPS)\n` +
            `⏱ <b>Davomiyligi:</b> ${metadata.durationSeconds.toFixed(1)} soniya\n` +
            `📊 <b>Bugungi qoldiq:</b> ${quota.remaining} / ${quota.maxLimit}\n\n` +
            `<b>AI orqali qaysi sifat darajasiga ko'tarmoqchisiz?</b>`, getVideoResolutionKeyboard(lang));
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error handling incoming video:', { error: errorMsg });
        await ctx.reply(`❌ <b>Could not process video:</b> ${errorMsg}`, { parse_mode: 'HTML' });
    }
}
//# sourceMappingURL=video.handler.js.map