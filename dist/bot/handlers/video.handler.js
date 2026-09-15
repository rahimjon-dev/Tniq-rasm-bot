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
            languageCode: ctx.from?.language_code,
        });
        const lang = user.languageCode || 'uz';
        const t = getT(lang);
        const plan = user.subscription?.plan || 'FREE';
        const quota = await UsageService.canProcessVideo(user.id, plan);
        if (!quota.allowed) {
            await ctx.replyWithHTML(`⚠️ <b>Kunlik limitga yetildi!</b>\n\n` +
                `Siz bugun uchun belgilangan barcha (<b>${quota.maxLimit} ta</b>) bepul video tiniqlashtirish limitidan foydalandingiz.\n\n` +
                `Ertaga soat 00:00 da limit avtomatik yangilanadi!`);
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
                `Videongiz hajmi ${(video.file_size / (1024 * 1024)).toFixed(1)}MB. ` +
                `Maksimal ruxsat etilgan hajm: <b>${config.MAX_VIDEO_SIZE_MB}MB</b>.`);
            return;
        }
        const statusMsg = await ctx.reply('⏳ <i>...</i>', { parse_mode: 'HTML' });
        // 3. Download Video to storage/temp
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const tempVideoPath = path.join(config.paths.tempStorage, `video_in_${uniqueId}.mp4`);
        const fileLink = await ctx.telegram.getFileLink(video.file_id);
        await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), tempVideoPath);
        // 4. Inspect Metadata via FFprobe
        const meta = await FFmpegService.getMetadata(tempVideoPath);
        // 5. Enforce Duration Limit
        if (meta.durationSeconds > config.MAX_VIDEO_DURATION_SECONDS) {
            await ImageService.safeDelete(tempVideoPath);
            try {
                await ctx.deleteMessage(statusMsg.message_id);
            }
            catch { }
            await ctx.replyWithHTML(`⏱ <b>Video davomiyligi cheklangan!</b>\n\n` +
                `Videongiz davomiyligi <b>${meta.durationSeconds.toFixed(1)}s</b>.\n` +
                `Maksimal ruxsat etilgan davomiylik: <b>${config.MAX_VIDEO_DURATION_SECONDS} soniya</b>.\n\n` +
                `💡 <i>Iltimos, qisqaroq video yuboring.</i>`);
            return;
        }
        // 6. Save in Pending Map
        pendingVideoUploads.set(telegramId, {
            userId: user.id,
            filePath: tempVideoPath,
            originalWidth: meta.width,
            originalHeight: meta.height,
            fps: meta.fps,
            durationSeconds: meta.durationSeconds,
            language: lang,
            timestamp: Date.now(),
        });
        try {
            await ctx.deleteMessage(statusMsg.message_id);
        }
        catch { }
        // 7. Present Target Resolution Options
        await ctx.replyWithHTML(`🎬 <b>Video qabul qilindi!</b>\n\n` +
            `📐 <b>O'lchami:</b> ${meta.width} × ${meta.height} px\n` +
            `⏱ <b>Davomiyligi:</b> ${meta.durationSeconds.toFixed(1)}s (${meta.fps} FPS)\n` +
            `🔊 <b>Ovoz:</b> ${meta.hasAudio ? 'Mavjud (Sinxron saqlanadi)' : 'Mavjud emas'}\n` +
            `📊 <b>Bugungi qoldiq:</b> ${quota.remaining} / ${quota.maxLimit}\n\n` +
            `<b>AI orqali erishmoqchi bo'lgan sifat darajasini tanlang:</b>`, getVideoResolutionKeyboard(lang));
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error handling incoming video:', { error: errorMsg });
        await ctx.reply(`❌ <b>Could not process video:</b> ${errorMsg}`, { parse_mode: 'HTML' });
    }
}
//# sourceMappingURL=video.handler.js.map