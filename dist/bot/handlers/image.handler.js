import path from 'path';
import crypto from 'crypto';
import config from '../../config/index.js';
import UserService from '../../services/user.service.js';
import UsageService from '../../services/usage.service.js';
import ImageService from '../../services/media/image.service.js';
import { getScaleSelectionKeyboard } from '../keyboards/main.keyboard.js';
import { getT } from '../../i18n/index.js';
import logger from '../../utils/logger.js';
// Pending media waiting for user to select 2x or 4x scale
export const pendingImageUploads = new Map();
export async function handleIncomingPhoto(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    try {
        // 1. Authenticate / Register User & Check Quota
        const user = await UserService.findOrCreateUser({
            telegramId,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            languageCode: ctx.from?.language_code,
        });
        const lang = user.languageCode || 'uz';
        const t = getT(lang);
        const plan = user.subscription?.plan || 'FREE';
        const quota = await UsageService.canProcessImage(user.id, plan);
        if (!quota.allowed) {
            await ctx.replyWithHTML(`⚠️ <b>Kunlik limitga yetildi!</b>\n\n` +
                `Siz bugun uchun belgilangan barcha (<b>${quota.maxLimit} ta</b>) bepul rasm tiniqlashtirish limitidan foydalandingiz.\n\n` +
                `Ertaga soat 00:00 da limit avtomatik yangilanadi!`);
            return;
        }
        // 2. Identify highest resolution photo
        // @ts-ignore
        const photos = ctx.message?.photo;
        if (!photos || photos.length === 0)
            return;
        const bestPhoto = photos[photos.length - 1];
        const statusMsg = await ctx.reply('⏳ <i>...</i>', { parse_mode: 'HTML' });
        // 3. Download to storage/temp
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const tempInputPath = path.join(config.paths.tempStorage, `input_${uniqueId}.jpg`);
        const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
        await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), tempInputPath);
        // 4. Validate file integrity & dimensions
        const inspected = await ImageService.inspectAndValidate(tempInputPath);
        // 5. Save in pending map (expires after 10 mins)
        pendingImageUploads.set(telegramId, {
            userId: user.id,
            filePath: tempInputPath,
            originalWidth: inspected.width,
            originalHeight: inspected.height,
            language: lang,
            timestamp: Date.now(),
        });
        // Clean up loading message
        try {
            await ctx.deleteMessage(statusMsg.message_id);
        }
        catch { }
        // 6. Present Scale Selection in user's language
        await ctx.replyWithHTML(t.image_received(inspected.width, inspected.height, quota.remaining, quota.maxLimit), getScaleSelectionKeyboard(lang));
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error handling incoming photo:', { error: errorMsg });
        await ctx.reply(`❌ <b>Could not process image:</b> ${errorMsg}`, { parse_mode: 'HTML' });
    }
}
export async function handleIncomingDocument(ctx) {
    const telegramId = ctx.from?.id;
    // @ts-ignore
    const doc = ctx.message?.document;
    if (!telegramId || !doc)
        return;
    // Check if document is an image
    if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
        await ctx.reply('⚠️ Iltimos, rasm formatidagi fayl yuboring (JPG, PNG, WebP).');
        return;
    }
    try {
        const user = await UserService.findOrCreateUser({
            telegramId,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            languageCode: ctx.from?.language_code,
        });
        const lang = user.languageCode || 'uz';
        const t = getT(lang);
        const plan = user.subscription?.plan || 'FREE';
        const quota = await UsageService.canProcessImage(user.id, plan);
        if (!quota.allowed) {
            await ctx.replyWithHTML(`⚠️ <b>Kunlik limitga yetildi!</b>\n` +
                `Siz bugun uchun barcha (${quota.maxLimit} ta) rasm limitidan foydalandingiz.`);
            return;
        }
        const statusMsg = await ctx.reply('⏳ <i>...</i>', { parse_mode: 'HTML' });
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const ext = doc.file_name ? path.extname(doc.file_name) : '.jpg';
        const tempInputPath = path.join(config.paths.tempStorage, `input_${uniqueId}${ext}`);
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);
        await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), tempInputPath);
        const inspected = await ImageService.inspectAndValidate(tempInputPath);
        pendingImageUploads.set(telegramId, {
            userId: user.id,
            filePath: tempInputPath,
            originalWidth: inspected.width,
            originalHeight: inspected.height,
            language: lang,
            timestamp: Date.now(),
        });
        try {
            await ctx.deleteMessage(statusMsg.message_id);
        }
        catch { }
        await ctx.replyWithHTML(t.document_received(inspected.width, inspected.height), getScaleSelectionKeyboard(lang));
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Error handling document image:', { error: errorMsg });
        await ctx.reply(`❌ <b>Could not process file:</b> ${errorMsg}`, { parse_mode: 'HTML' });
    }
}
//# sourceMappingURL=image.handler.js.map