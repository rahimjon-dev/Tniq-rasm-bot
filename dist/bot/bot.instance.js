import { Telegraf } from 'telegraf';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { mainKeyboard, languageKeyboard, getMainKeyboard } from './keyboards/main.keyboard.js';
import { getT, translations } from '../i18n/index.js';
import { handleIncomingPhoto, handleIncomingDocument } from './handlers/image.handler.js';
import { handleIncomingVideo } from './handlers/video.handler.js';
import { handleScaleSelection, handleVideoResolutionSelection, handleCancelAction } from './handlers/callback.handler.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import UserService from '../services/user.service.js';
import UsageService from '../services/usage.service.js';
import PaymentService from '../services/payments/payment.service.js';
import AdminService from '../services/admin.service.js';
import { handleAdminCommand, handleStatsCommand, handleBroadcastCommand, handleBanCommand, handleUnbanCommand, handleSetPlanCommand, } from './commands/admin.command.js';
export const bot = new Telegraf(config.BOT_TOKEN);
// Global Error Handler
bot.catch((err, ctx) => {
    logger.error(`Unhandled error during update ${ctx.update.update_id}:`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        updateType: ctx.updateType,
    });
    try {
        ctx.reply('⚠️ An unexpected error occurred while processing your request. Our team has been notified.');
    }
    catch (replyErr) {
        logger.error('Failed to send error message to user:', replyErr);
    }
});
// Middleware: Logging request metrics
bot.use(async (ctx, next) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const username = ctx.from?.username || 'unknown';
    logger.debug(`[INCOMING] User=${userId} (@${username}) Type=${ctx.updateType}`);
    await next();
    const duration = Date.now() - start;
    logger.debug(`[COMPLETED] User=${userId} Duration=${duration}ms`);
});
// Middleware: Anti-Abuse Rate Limiting
bot.use(rateLimitMiddleware);
// -----------------------------------------------------------------------------
// COMMANDS & HEAR HANDLERS
// -----------------------------------------------------------------------------
// /start
bot.start(async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const existingLang = await UserService.getUserLanguage(telegramId);
    if (!existingLang) {
        // Prompt user to select language first
        await ctx.replyWithHTML(translations.uz.choose_language, languageKeyboard);
        return;
    }
    const t = getT(existingLang);
    const name = ctx.from?.first_name || 'Creator';
    await ctx.replyWithHTML(t.welcome(name), getMainKeyboard(existingLang));
});
// Language selection callbacks
bot.action(['set_lang_uz', 'set_lang_en', 'set_lang_ru'], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    // @ts-ignore
    const data = ctx.callbackQuery?.data;
    const lang = data === 'set_lang_ru' ? 'ru' : data === 'set_lang_en' ? 'en' : 'uz';
    await UserService.setUserLanguage(telegramId, lang);
    await ctx.answerCbQuery();
    const t = getT(lang);
    const name = ctx.from?.first_name || 'Creator';
    try {
        await ctx.deleteMessage();
    }
    catch { }
    await ctx.replyWithHTML(t.language_selected);
    await ctx.replyWithHTML(t.welcome(name), getMainKeyboard(lang));
});
// Change language command & menu button
bot.hears(['🌐 Change Language', '🌐 Tilni o\'zgartirish', '🌐 Сменить язык', '/language', '/lang'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.choose_language, languageKeyboard);
});
// 🖼 Upscale Image
bot.hears(['🖼 Upscale Image', '🖼 Rasm Tiniqlashtirish', '🖼 Улучшить фото', '/image'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.image_mode(config.MAX_IMAGE_SIZE_MB), getMainKeyboard(lang));
});
// 🎬 Upscale Video
bot.hears(['🎬 Video 4K qilish', '🎬 Upscale Video', '🎬 Video Tiniqlashtirish', '🎬 Улучшить видео', '/video'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.video_mode(config.MAX_VIDEO_SIZE_MB, config.MAX_VIDEO_DURATION_SECONDS), getMainKeyboard(lang));
});
// 👤 My Account
bot.hears(['👤 My Account', '👤 Profilim', '👤 Mening Hisobim', '👤 Мой профиль', '/account'], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({
        telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        languageCode: ctx.from?.language_code,
    });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    const totalJobs = await UserService.getUserTotalJobsCount(user.id);
    const joinedDate = new Date(user.createdAt).toLocaleDateString();
    await ctx.replyWithHTML(t.account_info(telegramId, ctx.from?.first_name || 'User', ctx.from?.username || '', totalJobs, joinedDate), getMainKeyboard(lang));
});
// 📊 My Usage
bot.hears(['📊 My Usage', '📊 Limitlar', '📊 Kunlik Limitlar', '📊 Лимиты', '/usage'], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    const summary = await UsageService.getUserUsageSummary(user.id, 'FREE');
    await ctx.replyWithHTML(t.usage_info(summary.date, summary.imagesUsed, summary.imagesMax, summary.imagesRemaining, summary.videosUsed, summary.videosMax, summary.videosRemaining), getMainKeyboard(lang));
});
// 📜 Processing History
bot.hears(['📜 History', '📜 Tarix', '📜 История', '/history'], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    const jobs = await UserService.getUserHistory(user.id, 5);
    if (jobs.length === 0) {
        await ctx.replyWithHTML(t.history_empty, getMainKeyboard(lang));
        return;
    }
    const title = lang === 'ru' ? 'История обработки' : lang === 'en' ? 'Processing History' : 'Ishlar Tarixi';
    let historyText = `📜 <b>${title}:</b>\n\n`;
    for (const j of jobs) {
        const icon = j.type === 'IMAGE' ? '🖼' : '🎬';
        const statusIcon = j.status === 'COMPLETED' ? '✅' : '❌';
        const time = j.processingTime ? `(${j.processingTime.toFixed(1)}s)` : '';
        const date = new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        historyText += `${icon} <b>${j.type} (${j.scale}x):</b> ${j.inputResolution || '?'} ➔ <b>${j.outputResolution || '?'}</b> ${statusIcon} ${time} [${date}]\n`;
    }
    await ctx.replyWithHTML(historyText, getMainKeyboard(lang));
});
// ℹ️ Help
bot.hears(['ℹ️ Help', 'ℹ️ Yordam', 'ℹ️ Помощь', '/help'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.help_text, getMainKeyboard(lang));
});
// Photo & Image Document Upload Handlers
bot.on('photo', handleIncomingPhoto);
bot.on('document', handleIncomingDocument);
// Video Upload Handlers
bot.on(['video', 'video_note', 'animation'], handleIncomingVideo);
// Callback Queries for Scale Selection (Image)
bot.action('scale_2x', (ctx) => handleScaleSelection(ctx, 2));
bot.action('scale_4x', (ctx) => handleScaleSelection(ctx, 4));
// Callback Queries for Resolution Selection (Video)
bot.action('video_res_720p', (ctx) => handleVideoResolutionSelection(ctx, '720p'));
bot.action('video_res_1080p', (ctx) => handleVideoResolutionSelection(ctx, '1080p'));
bot.action('video_res_2K', (ctx) => handleVideoResolutionSelection(ctx, '2K'));
bot.action('video_res_4K', (ctx) => handleVideoResolutionSelection(ctx, '4K'));
// Plans & Payment Actions
bot.action('activate_free_beta', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    await ctx.answerCbQuery();
    const result = await PaymentService.activateFreeBetaPass(telegramId);
    await ctx.replyWithHTML(result.message, mainKeyboard);
});
bot.action('buy_stars_pro', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    await ctx.answerCbQuery();
    await PaymentService.sendStarsInvoice(telegramId, 'PRO');
});
bot.action('buy_stars_business', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    await ctx.answerCbQuery();
    await PaymentService.sendStarsInvoice(telegramId, 'BUSINESS');
});
// Telegram Payment Webhooks & Verification
bot.on('pre_checkout_query', PaymentService.handlePreCheckout);
bot.on('successful_payment', PaymentService.handleSuccessfulPayment);
// Admin Commands & Actions
bot.command('admin', handleAdminCommand);
bot.command('stats', handleStatsCommand);
bot.command('broadcast', handleBroadcastCommand);
bot.command('ban', handleBanCommand);
bot.command('unban', handleUnbanCommand);
bot.command('setplan', handleSetPlanCommand);
bot.action('admin_stats', handleStatsCommand);
bot.action('admin_jobs', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !AdminService.isAdmin(telegramId))
        return;
    await ctx.answerCbQuery();
    const jobs = await AdminService.getRecentJobs(8);
    if (jobs.length === 0) {
        await ctx.reply('📋 Hozircha qayta ishlangan ishlar mavjud emas.');
        return;
    }
    let txt = `📋 <b>So'nggi qayta ishlangan ishlar (Oxirgi 8 ta):</b>\n\n`;
    for (const j of jobs) {
        const icon = j.type === 'IMAGE' ? '🖼' : '🎬';
        const status = j.status === 'COMPLETED' ? '✅' : '❌';
        txt += `${icon} <code>${j.id.slice(0, 8)}</code> | ${j.type} (${j.scale}x) | ${status} | ${j.processingTime?.toFixed(1) || '?'}s\n`;
    }
    await ctx.replyWithHTML(txt);
});
bot.action('admin_users', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !AdminService.isAdmin(telegramId))
        return;
    await ctx.answerCbQuery();
    const users = await AdminService.getRecentUsers(8);
    if (users.length === 0) {
        await ctx.reply('👥 Hozircha foydalanuvchilar mavjud emas.');
        return;
    }
    let txt = `👥 <b>So'nggi qo'shilgan foydalanuvchilar:</b>\n\n`;
    for (const u of users) {
        const username = u.username ? `@${u.username}` : u.firstName || 'User';
        const plan = u.subscription?.plan || 'FREE';
        txt += `• <code>${u.telegramId}</code> (${username}) — <b>${plan}</b>\n`;
    }
    await ctx.replyWithHTML(txt);
});
bot.action('admin_broadcast_info', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !AdminService.isAdmin(telegramId))
        return;
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(`📢 <b>Barcha foydalanuvchilarga xabar yuborish uchun:</b>\n\n` +
        `Quyidagi formatda xabar yozing:\n` +
        `<code>/broadcast Hurmatli foydalanuvchilar, yangi imkoniyatlar qo'shildi!</code>`);
});
bot.action('cancel_action', handleCancelAction);
export async function registerBotCommands() {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Botni ishga tushirish va asosiy menyu' },
            { command: 'image', description: 'Rasm tiniqlashtirish (2x / 4x)' },
            { command: 'video', description: 'Video tiniqlashtirish (1080p / 4K)' },
            { command: 'history', description: 'Oxirgi ishlar tarixi' },
            { command: 'account', description: 'Profil ma\'lumotlari' },
            { command: 'usage', description: 'Bugungi foydalanish statistikasi' },
            { command: 'help', description: 'Bot haqida qisqacha ma\'lumot' },
            { command: 'admin', description: 'Admin boshqaruv paneli' },
        ]);
        logger.info('Telegram bot commands registered successfully');
    }
    catch (error) {
        logger.warn('Could not register bot commands with Telegram:', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=bot.instance.js.map