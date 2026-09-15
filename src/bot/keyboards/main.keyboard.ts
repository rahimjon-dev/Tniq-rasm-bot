import { Markup } from 'telegraf';
import { getT, Language } from '../../i18n/index.js';

export const languageKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🇺🇿 O'zbekcha", 'set_lang_uz'),
    Markup.button.callback('🇬🇧 English', 'set_lang_en'),
    Markup.button.callback('🇷🇺 Русский', 'set_lang_ru'),
  ],
]);

export function getMainKeyboard(lang?: string | null) {
  const t = getT(lang);
  return Markup.keyboard([
    [t.btn_image, t.btn_video],
    [t.btn_account, t.btn_history],
    [t.btn_usage, t.btn_language],
    [t.btn_help],
  ]).resize();
}

export function getScaleSelectionKeyboard(lang?: string | null) {
  const t = getT(lang);
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t.btn_scale_2x, 'scale_2x'),
      Markup.button.callback(t.btn_scale_4x, 'scale_4x'),
    ],
    [Markup.button.callback(t.btn_cancel, 'cancel_action')],
  ]);
}

export function getVideoResolutionKeyboard(lang?: string | null) {
  const t = getT(lang);
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t.btn_res_720, 'video_res_720p'),
      Markup.button.callback(t.btn_res_1080, 'video_res_1080p'),
    ],
    [
      Markup.button.callback(t.btn_res_2k, 'video_res_2K'),
      Markup.button.callback(t.btn_res_4k, 'video_res_4K'),
    ],
    [Markup.button.callback(t.btn_cancel, 'cancel_action')],
  ]);
}

// Defaults for backward compatibility
export const mainKeyboard = getMainKeyboard('uz');
export const scaleSelectionKeyboard = getScaleSelectionKeyboard('uz');
export const videoResolutionKeyboard = getVideoResolutionKeyboard('uz');
