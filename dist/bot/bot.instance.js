import { Telegraf, Markup } from 'telegraf';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { mainKeyboard, languageKeyboard, getMainKeyboard, getSettingsKeyboard, } from './keyboards/main.keyboard.js';
import { getT } from '../i18n/index.js';
import { handleIncomingPhoto, handleIncomingDocument } from './handlers/image.handler.js';
import { handleIncomingVideo } from './handlers/video.handler.js';
import { handleScaleSelection, handleVideoResolutionSelection, handleCancelAction, } from './handlers/callback.handler.js';
import { handleProCustomBackgroundCommand, handleResetCustomBackground, awaitingProBackgroundUsers, } from './handlers/pro-background.handler.js';
import { handleStarRatingCallback, checkAndProcessReviewComment, handleReviewCommand, pendingReviewRatings, } from './handlers/review.handler.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import UserService from '../services/user.service.js';
import UsageService from '../services/usage.service.js';
import PaymentService from '../services/payments/payment.service.js';
import AdminService from '../services/admin.service.js';
import PlanService from '../services/plan.service.js';
import store from '../services/store.service.js';
import { handleAdminCommand, handleStatsCommand, handleBroadcastCommand, handleBanCommand, handleUnbanCommand, handleSetPlanCommand, } from './commands/admin.command.js';
export const bot = new Telegraf(config.BOT_TOKEN);
// Global Error Handler
bot.catch((err, ctx) => {
    logger.error(`Unhandled error during update ${ctx.update?.update_id}:`, {
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
// Middleware: Logging request metrics & Auto-saving active users to store
bot.use(async (ctx, next) => {
    const start = Date.now();
    const from = ctx.from;
    if (from && from.id) {
        store.saveUser({
            telegramId: from.id,
            username: from.username || null,
            firstName: from.first_name || null,
            lastName: from.last_name || null,
            lastAction: ctx.message ? 'Sent message' : (ctx.callbackQuery ? 'Pressed button' : 'Active'),
        });
    }
    const userId = from?.id;
    const username = from?.username || 'unknown';
    logger.debug(`[INCOMING] Update=${ctx.updateType} User=${userId} (${username})`);
    await next();
    const duration = Date.now() - start;
    logger.debug(`[COMPLETED] User=${userId} Duration=${duration}ms`);
});
// Middleware: Strict Ban Enforcement (blocks banned users instantly)
bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return next();
    if (store.isUserBanned(telegramId)) {
        logger.warn(`[BLOCKED_USER] Prevented banned user ${telegramId} from executing action.`);
        if (ctx.callbackQuery) {
            try {
                await ctx.answerCbQuery('⛔️ Siz bot ma\'muriyati tomonidan bloklangansiz!', { show_alert: true });
            }
            catch { }
            return;
        }
        try {
            await ctx.replyWithHTML('⛔️ <b>Kirish taqiqlangan!</b>\n\n' +
                'Siz bot ma\'muriyati tomonidan bloklangansiz. Bot xizmatlaridan foydalana olmaysiz.\n' +
                'Qo\'shimcha ma\'lumot olish uchun ma\'muriyat bilan bog\'laning: @rahmonoov_19');
        }
        catch { }
        return;
    }
    return next();
});
// Middleware: Anti-Abuse Rate Limiting
bot.use(rateLimitMiddleware);
// Middleware: Review comment interceptor
bot.use(async (ctx, next) => {
    if (ctx.message && 'text' in ctx.message) {
        const text = (ctx.message.text || '').trim();
        const tid = ctx.from?.id;
        if (tid && pendingReviewRatings.has(tid)) {
            if (text === '/start') {
                pendingReviewRatings.delete(tid);
                return next();
            }
            const handled = await checkAndProcessReviewComment(ctx);
            if (handled)
                return;
        }
    }
    return next();
});
// -----------------------------------------------------------------------------
// COMMANDS & HEAR HANDLERS
// -----------------------------------------------------------------------------
// /start
bot.start(async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    awaitingProBackgroundUsers.delete(telegramId);
    // Register or update user record in persistent storage
    await UserService.findOrCreateUser({
        telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        lastAction: '/start',
    });
    const langPrompt = `👋 <b>Assalomu alaykum! / Здравствуйте! / Hello!</b>\n\n` +
        `🇺🇿 Iltimos, muloqot tilini tanlang:\n` +
        `🇷🇺 Пожалуйста, выберите язык общения:\n` +
        `🇬🇧 Please choose your preferred language:`;
    await ctx.replyWithHTML(langPrompt, languageKeyboard);
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
// 🔄 Restart Bot
bot.hears([
    '🔄 Botni qayta ishga tushirish',
    '🔄 Restart Bot',
    '🔄 Перезапустить бота',
    '/restart',
], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    awaitingProBackgroundUsers.delete(telegramId);
    const lang = (await UserService.getUserLanguage(telegramId)) || 'uz';
    const t = getT(lang);
    const name = ctx.from?.first_name || 'Creator';
    UserService.updateActivity(telegramId, 'Restarted bot');
    await ctx.replyWithHTML(t.restart_success);
    await ctx.replyWithHTML(t.welcome(name), getMainKeyboard(lang));
});
// 💎 Plans
bot.hears([
    '💎 Tariflar',
    '💎 Plans',
    '💎 Тарифы',
    '/plans',
    '/tariffs',
], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    if (ctx.from?.id)
        UserService.updateActivity(ctx.from.id, 'Viewed plans');
    const contactText = lang === 'ru'
        ? '💬 Написать администратору'
        : lang === 'en'
            ? '💬 Contact Administrator'
            : '💬 Admin bilan bog\'lanish';
    await ctx.replyWithHTML(t.plans_info, Markup.inlineKeyboard([
        [Markup.button.url(contactText, 'https://t.me/rahmonoov_19')],
    ]));
});
// ⚙️ Settings
bot.hears([
    '⚙️ Sozlamalar',
    '⚙️ Settings',
    '⚙️ Настройки',
    '/settings',
], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    if (ctx.from?.id)
        UserService.updateActivity(ctx.from.id, 'Viewed settings');
    await ctx.replyWithHTML(t.settings_menu, getSettingsKeyboard(lang));
});
// Settings Actions
bot.action('settings_change_language', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.choose_language, languageKeyboard);
});
bot.action('settings_pro_custom_bg', async (ctx) => {
    await ctx.answerCbQuery();
    await handleProCustomBackgroundCommand(ctx);
});
bot.action('settings_reset_custom_bg', async (ctx) => {
    await ctx.answerCbQuery();
    await handleResetCustomBackground(ctx);
});
// Change language command & menu button
bot.hears(['🌐 Change Language', '🌐 Tilni o\'zgartirish', '🌐 Сменить язык', '/language', '/lang'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    await ctx.replyWithHTML(t.choose_language, languageKeyboard);
});
// 🎨 / 🖼 Upscale Image
bot.hears([
    '🎨 Rasm Tiniqlashtirish',
    '🎨 Upscale Image',
    '🎨 Улучшить фото',
    '🖼 Upscale Image',
    '🖼 Rasm Tiniqlashtirish',
    '🖼 Улучшить фото',
    '/image',
], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    if (ctx.from?.id)
        UserService.updateActivity(ctx.from.id, 'Image mode');
    await ctx.replyWithHTML(t.image_mode(config.MAX_IMAGE_SIZE_MB), getMainKeyboard(lang));
});
// 🎬 Upscale Video
bot.hears([
    '🎬 Video Tiniqlashtirish',
    '🎬 Upscale Video',
    '🎬 Улучшить видео',
    '🎬 Video 4K qilish',
    '/video',
], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    if (ctx.from?.id)
        UserService.updateActivity(ctx.from.id, 'Video mode');
    await ctx.replyWithHTML(t.video_mode(config.MAX_VIDEO_SIZE_MB, config.MAX_VIDEO_DURATION_SECONDS), getMainKeyboard(lang));
});
// 👤 My Profile
bot.hears([
    '👤 Profilim',
    '👤 My Profile',
    '👤 Мой профиль',
    '👤 My Account',
    '👤 Mening Hisobim',
    '/account',
    '/profile',
], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({
        telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        lastAction: 'Viewed profile',
    });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    const totalJobs = user.totalJobs || (await UserService.getUserTotalJobsCount(user.id));
    const joinedDate = new Date(user.createdAt).toLocaleDateString();
    const planName = PlanService.getPlanDisplayName(user.plan, lang);
    const hasCustomBg = !!UserService.getUserCustomBackground(telegramId);
    await ctx.replyWithHTML(t.account_info(telegramId, ctx.from?.first_name || 'User', ctx.from?.username || '', planName, totalJobs, joinedDate, hasCustomBg), getMainKeyboard(lang));
});
// 📊 My Usage
bot.hears([
    '📊 Limitlarim',
    '📊 My Usage',
    '📊 Мои лимиты',
    '📊 Limitlar',
    '📊 Kunlik Limitlar',
    '📊 Лимиты',
    '/usage',
], async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId)
        return;
    const user = await UserService.findOrCreateUser({ telegramId });
    const lang = user.languageCode || 'uz';
    const t = getT(lang);
    const summary = await UsageService.getUserUsageSummary(user.id, telegramId, user.plan);
    const planName = PlanService.getPlanDisplayName(user.plan, lang);
    UserService.updateActivity(telegramId, 'Checked usage');
    await ctx.replyWithHTML(t.usage_info(summary.date, planName, summary.imagesUsed, summary.isUnlimitedImages ? 'Cheksiz / Unlimited' : summary.imagesMax, summary.isUnlimitedImages ? 'Cheksiz' : summary.imagesRemaining, summary.videosUsed, summary.isUnlimitedVideos ? 'Cheksiz / Unlimited' : summary.videosMax, summary.isUnlimitedVideos ? 'Cheksiz' : summary.videosRemaining), getMainKeyboard(lang));
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
// ❓ / ℹ️ Help
bot.hears(['❓ Yordam', '❓ Help', '❓ Помощь', 'ℹ️ Help', 'ℹ️ Yordam', 'ℹ️ Помощь', '/help'], async (ctx) => {
    const lang = (await UserService.getUserLanguage(ctx.from?.id)) || 'uz';
    const t = getT(lang);
    if (ctx.from?.id)
        UserService.updateActivity(ctx.from.id, 'Viewed help');
    await ctx.replyWithHTML(t.help_text, getMainKeyboard(lang));
});
// ⭐️ Reviews & Rating
bot.hears([
    '⭐️ Fikr bildirish',
    '⭐️ Leave Feedback',
    '⭐️ Оставить отзыв',
    '⭐️ Baholash',
    '⭐️ Baholash & Fikr',
    '/review',
    '/rate',
    '/feedback',
], handleReviewCommand);
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
// Callback Queries for 1-5 Star Ratings
bot.action('rate_star_1', (ctx) => handleStarRatingCallback(ctx, 1));
bot.action('rate_star_2', (ctx) => handleStarRatingCallback(ctx, 2));
bot.action('rate_star_3', (ctx) => handleStarRatingCallback(ctx, 3));
bot.action('rate_star_4', (ctx) => handleStarRatingCallback(ctx, 4));
bot.action('rate_star_5', (ctx) => handleStarRatingCallback(ctx, 5));
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
// Admin Commands & Actions (Only accessible via secret password 0603 or authorized admin ID)
bot.command('admin', handleAdminCommand);
bot.hears(['0603', '/admin 0603'], handleAdminCommand);
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
bot.action('admin_web_link', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !AdminService.isAdmin(telegramId))
        return;
    await ctx.answerCbQuery();
    await ctx.replyWithHTML(`🌐 <b>AI MEDIA UPSCALER — VEB ADMIN DASHBOARD</b>\n\n` +
        `Brauzeringiz orqali kompyuter yoki telefondan to'liq boshqaruv paneliga kirishingiz mumkin:\n\n` +
        `🔗 <b>Manzil:</b> <code>http://localhost:3000/admin</code>\n` +
        `🔑 <b>Maxfiy kalit:</b> <code>${config.ADMIN_SECRET_KEY}</code>\n\n` +
        `<i>Ushbu havola orqali jonli statistika, barcha foydalanuvchilar jadvali, xabar tarqatish studiyasi va navbatni real-vaqtda kuzatishingiz mumkin.</i>`);
});
bot.action('cancel_action', handleCancelAction);
export async function registerBotCommands() {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Botni ishga tushirish va asosiy menyu' },
            { command: 'image', description: 'Rasm tiniqlashtirish (2x / 4x)' },
            { command: 'video', description: 'Video tiniqlashtirish (1080p / 4K)' },
            { command: 'account', description: 'Profil ma\'lumotlari' },
            { command: 'usage', description: 'Bugungi limitlar statistikasi' },
            { command: 'plans', description: 'Tarif rejalari (Free, Premium, Pro)' },
            { command: 'settings', description: 'Sozlamalar va Maxsus Fon' },
            { command: 'review', description: 'Botni baholash va fikr qoldirish' },
            { command: 'restart', description: 'Bot interfeysini yangilash' },
            { command: 'help', description: 'Bot haqida qisqacha ma\'lumot' },
        ]);
        // Set Chat Menu Button in bottom-left corner to open 4K Studio Mini App
        try {
            const publicBaseUrl = (config.WEBHOOK_DOMAIN ||
                config.RENDER_EXTERNAL_URL ||
                'https://tniq-rasm-bot.onrender.com').replace(/\/$/, '');
            const miniAppUrl = `${publicBaseUrl}/app`;
            // @ts-ignore
            await bot.telegram.setChatMenuButton({
                menuButton: {
                    type: 'web_app',
                    text: '🚀 4K Studio',
                    web_app: { url: miniAppUrl },
                },
            });
            logger.info(`✅ Telegram Chat Menu Button configured: ${miniAppUrl}`);
        }
        catch (btnErr) {
            logger.warn('Could not set chat menu button, keeping standard commands:', btnErr);
        }
        try {
            // @ts-ignore
            await bot.telegram.setMyName('Remini AI | HD Rasm & Video Tiniqlashtirish');
            // @ts-ignore
            await bot.telegram.setMyShortDescription('Remini AI — Rasmlar va videolarni 4K Ultra HD formatda 1-3 soniyada tiniqlashtiruvchi eng kuchli AI bot.');
            // @ts-ignore
            await bot.telegram.setMyDescription('🤖 Rasmlar va videolaringizni eng kuchli sun\'iy intellekt (Remini AI) yordamida kristaldek tiniqlashtiring va 4K Ultra HD ga oshiring!\n\n' +
                '✨ Asosiy imkoniyatlar:\n' +
                '• Xira va eski rasmlarni 1-3 soniyada tiniqlashtirish\n' +
                '• Yuz va libos detallarini 4K Ultra HD formatda tiklash\n' +
                '• Videolarni 720p, 1080p va 4K sifatga ko\'tarish\n' +
                '• 100% asl sifatda hujjat (Document) ko\'rinishida yuklab olish');
        }
        catch (seoErr) {
            logger.debug('SEO profile setup notice:', seoErr);
        }
        logger.info('Telegram bot commands and SEO profile registered successfully');
    }
    catch (error) {
        logger.warn('Could not register bot commands with Telegram:', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=bot.instance.js.map