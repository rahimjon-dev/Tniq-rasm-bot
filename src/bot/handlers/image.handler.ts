import path from 'path';
import crypto from 'crypto';
import { Context } from 'telegraf';
import config from '../../config/index.js';
import UserService from '../../services/user.service.js';
import UsageService from '../../services/usage.service.js';
import ImageService from '../../services/media/image.service.js';
import { getScaleSelectionKeyboard } from '../keyboards/main.keyboard.js';
import { getT } from '../../i18n/index.js';
import logger from '../../utils/logger.js';
import { checkAndProcessProBackgroundUpload } from './pro-background.handler.js';

// Pending media waiting for user to select 2x or 4x scale
export const pendingImageUploads = new Map<number, {
  userId: string;
  filePath: string;
  originalWidth: number;
  originalHeight: number;
  language: string;
  timestamp: number;
}>();

export async function handleIncomingPhoto(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // 1. Check if user is uploading a Pro Custom Background
  const handledAsProBg = await checkAndProcessProBackgroundUpload(ctx);
  if (handledAsProBg) return;

  try {
    // 2. Authenticate / Register User & Check Quota
    const user = await UserService.findOrCreateUser({
      telegramId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      lastAction: 'Sent Photo',
    });

    const lang = user.languageCode || 'uz';
    const t = getT(lang);

    const quota = await UsageService.canProcessImage(user.id, telegramId, user.plan);

    if (!quota.allowed) {
      const typeStr = lang === 'ru' ? 'фото' : lang === 'en' ? 'image' : 'rasm';
      await ctx.replyWithHTML(t.limit_reached(typeStr, quota.maxLimit));
      return;
    }

    // 3. Identify highest resolution photo (select last element in photo array)
    // @ts-ignore
    const photos = ctx.message?.photo;
    if (!photos || photos.length === 0) return;

    const bestPhoto = photos[photos.length - 1];

    const statusMsg = await ctx.reply('⏳ <i>...</i>', { parse_mode: 'HTML' });

    // 4. Download to storage/temp
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const tempInputPath = path.join(config.paths.tempStorage, `input_${uniqueId}.jpg`);

    const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
    await ImageService.downloadTelegramFile(fileLink.href || String(fileLink), tempInputPath);

    // 5. Validate file integrity & dimensions
    const inspected = await ImageService.inspectAndValidate(tempInputPath);

    // 6. Save in pending map (expires after 10 mins)
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
    } catch {}

    // 7. Present Scale Selection in user's language
    await ctx.replyWithHTML(
      t.image_received(inspected.width, inspected.height, quota.remaining, quota.maxLimit),
      getScaleSelectionKeyboard(lang)
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error handling incoming photo:', { error: errorMsg });
    const userLang = (await UserService.getUserLanguage(telegramId)) || 'uz';
    await ctx.replyWithHTML(getT(userLang).process_image_error(errorMsg));
  }
}

export async function handleIncomingDocument(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  // @ts-ignore
  const doc = ctx.message?.document;
  if (!telegramId || !doc) return;

  // 1. Check if user is uploading a Pro Custom Background
  const handledAsProBg = await checkAndProcessProBackgroundUpload(ctx);
  if (handledAsProBg) return;

  const userLang = (await UserService.getUserLanguage(telegramId)) || 'uz';
  const t = getT(userLang);

  // Check if document is an image
  if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
    await ctx.replyWithHTML(t.doc_invalid_format);
    return;
  }

  try {
    const user = await UserService.findOrCreateUser({
      telegramId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      lastAction: 'Sent Document Image',
    });

    const lang = user.languageCode || userLang;
    const currentT = getT(lang);

    const quota = await UsageService.canProcessImage(user.id, telegramId, user.plan);

    if (!quota.allowed) {
      const typeStr = lang === 'ru' ? 'фото' : lang === 'en' ? 'image' : 'rasm';
      await ctx.replyWithHTML(currentT.limit_reached(typeStr, quota.maxLimit));
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
    } catch {}

    await ctx.replyWithHTML(
      currentT.image_received(inspected.width, inspected.height, quota.remaining, quota.maxLimit),
      getScaleSelectionKeyboard(lang)
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Error handling document image:', { error: errorMsg });
    await ctx.replyWithHTML(t.process_image_error(errorMsg));
  }
}
