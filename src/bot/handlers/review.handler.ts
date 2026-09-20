import { Context } from 'telegraf';
import store from '../../services/store.service.js';
import UserService from '../../services/user.service.js';
import { getT } from '../../i18n/index.js';
import { getStarRatingKeyboard } from '../keyboards/main.keyboard.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { bot } from '../bot.instance.js';

// Pending map for users who picked a star rating and may send a text review
export const pendingReviewRatings = new Map<number, {
  rating: number;
  timestamp: number;
}>();

/**
 * Send interactive star rating invitation after image/video processing completes
 */
export async function sendReviewInvitation(telegramChatId: number, lang = 'uz'): Promise<void> {
  try {
    const t = getT(lang);
    await bot.telegram.sendMessage(
      telegramChatId,
      t.review_prompt_after_job,
      {
        parse_mode: 'HTML',
        ...getStarRatingKeyboard(),
      }
    );
  } catch (err: any) {
    logger.debug(`[REVIEW] Could not send review invitation to ${telegramChatId}:`, err.message);
  }
}

/**
 * Handle user clicking ⭐ 1 - 5 star buttons
 */
export async function handleStarRatingCallback(ctx: Context, rating: number): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = (await UserService.getUserLanguage(telegramId)) || 'uz';
  const t = getT(userLang);

  // Save immediate rating in store (with previous comment if any or empty)
  const existingReview = store.getUserReview(telegramId);
  store.addReview({
    telegramId,
    rating,
    comment: existingReview?.comment || null,
  });

  // Track user for follow-up comment
  pendingReviewRatings.set(telegramId, {
    rating,
    timestamp: Date.now(),
  });

  try {
    await ctx.answerCbQuery(`⭐️ ${rating}/5 yulduz tanlandi!`);
  } catch {}

  // Prompt user to enter text comment or skip
  await ctx.replyWithHTML(t.review_rating_selected(rating));
}

/**
 * Check if the incoming text message is a review comment from a pending user
 */
export async function checkAndProcessReviewComment(ctx: Context): Promise<boolean> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return false;

  const pending = pendingReviewRatings.get(telegramId);
  if (!pending) return false;

  // Expire after 15 minutes
  if (Date.now() - pending.timestamp > 15 * 60 * 1000) {
    pendingReviewRatings.delete(telegramId);
    return false;
  }

  // @ts-ignore
  const text = ctx.message?.text?.trim();
  if (!text) return false;

  const userLang = (await UserService.getUserLanguage(telegramId)) || 'uz';
  const t = getT(userLang);

  // Handle skip commands
  if (text.toLowerCase() === '/skip' || text.toLowerCase() === 'skip' || text === "O'tkazib yuborish") {
    pendingReviewRatings.delete(telegramId);
    await ctx.replyWithHTML(t.review_thanks_no_comment(pending.rating));
    return true;
  }

  // If user typed another slash command (like /start, /help, /image), don't treat as comment
  if (text.startsWith('/') && text !== '/skip') {
    pendingReviewRatings.delete(telegramId);
    return false;
  }

  // Save review with text comment
  store.addReview({
    telegramId,
    rating: pending.rating,
    comment: text,
  });

  pendingReviewRatings.delete(telegramId);

  // Send thank you response to user
  await ctx.replyWithHTML(t.review_thanks(pending.rating));

  // Notify Admins in real-time
  const stars = '⭐'.repeat(pending.rating);
  const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  const username = ctx.from?.username ? `@${ctx.from.username}` : 'Mavjud emas';
  const nowStr = new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  for (const adminId of config.ADMIN_TELEGRAM_IDS) {
    try {
      await bot.telegram.sendMessage(
        Number(adminId),
        `🌟 <b>YANGI BAHOLASH VA IZOH!</b>\n\n` +
        `👤 <b>Foydalanuvchi:</b> ${name} (${username})\n` +
        `🆔 <b>Telegram ID:</b> <code>${telegramId}</code>\n` +
        `⭐ <b>Baho:</b> ${stars} (${pending.rating}/5)\n` +
        `💬 <b>Izoh:</b> <i>"${text}"</i>\n` +
        `📅 <b>Vaqt:</b> ${nowStr}`,
        { parse_mode: 'HTML' }
      );
    } catch (adminErr: any) {
      logger.debug('[REVIEW] Admin alert notice:', adminErr.message);
    }
  }

  return true;
}

/**
 * Handle manual /review or /rate command or button
 */
export async function handleReviewCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = (await UserService.getUserLanguage(telegramId)) || 'uz';
  const t = getT(userLang);

  const existing = store.getUserReview(telegramId);
  let msg = t.review_menu_prompt;
  if (existing) {
    msg += `\n\n<i>Sizning avvalgi bahoyingiz: ${existing.rating} ⭐</i>`;
    if (existing.comment) {
      msg += `\n<i>Izohingiz: "${existing.comment}"</i>`;
    }
  }

  await ctx.replyWithHTML(msg, getStarRatingKeyboard());
}
