import path from 'path';
import fs from 'fs';
import { Markup } from 'telegraf';
import UserService from '../../services/user.service.js';
import PlanService from '../../services/plan.service.js';
import ImageService from '../../services/media/image.service.js';
import { getMainKeyboard } from '../keyboards/main.keyboard.js';
import { getT } from '../../i18n/index.js';
import logger from '../../utils/logger.js';
export const awaitingProBackgroundUsers = new Set();
export async function handleProCustomBackgroundCommand(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    if (!PlanService.canUseCustomBackground(user.plan)) {
        await ctx.replyWithHTML(t.pro_only_feature);
        return;
    }
    awaitingProBackgroundUsers.add(telegramId);
    await ctx.replyWithHTML(t.pro_custom_bg_prompt, Markup.inlineKeyboard([[Markup.button.callback(t.btn_cancel, 'cancel_action')]]));
}
export async function handleResetCustomBackground(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    UserService.setUserCustomBackground(telegramId, null);
    awaitingProBackgroundUsers.delete(telegramId);
    await ctx.replyWithHTML(t.bg_removed_success);
}
export async function checkAndProcessProBackgroundUpload(ctx) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !awaitingProBackgroundUsers.has(telegramId)) {
        return false;
    }
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    if (!PlanService.canUseCustomBackground(user.plan)) {
        awaitingProBackgroundUsers.delete(telegramId);
        await ctx.replyWithHTML(t.pro_only_feature);
        return true;
    }
    try {
        // @ts-ignore
        const photos = ctx.message?.photo;
        // @ts-ignore
        const document = ctx.message?.document;
        let fileId;
        if (photos && photos.length > 0) {
            fileId = photos[photos.length - 1].file_id;
        }
        else if (document && (document.mime_type?.startsWith('image/') || document.file_name?.match(/\.(jpe?g|png|webp)$/i))) {
            fileId = document.file_id;
        }
        if (!fileId) {
            return false; // Not an image, let other handlers process
        }
        const bgDir = path.resolve(process.cwd(), 'storage/backgrounds');
        if (!fs.existsSync(bgDir)) {
            fs.mkdirSync(bgDir, { recursive: true });
        }
        const targetPath = path.join(bgDir, `bg_${telegramId}.jpg`);
        const fileLink = await ctx.telegram.getFileLink(fileId);
        await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), targetPath);
        UserService.setUserCustomBackground(telegramId, targetPath);
        awaitingProBackgroundUsers.delete(telegramId);
        await ctx.replyWithHTML(t.bg_saved_success, getMainKeyboard(lang));
        return true;
    }
    catch (err) {
        logger.error('Error setting pro background:', err);
        await ctx.reply('❌ Foni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return true;
    }
}
//# sourceMappingURL=pro-background.handler.js.map