import { Markup } from 'telegraf';
import config from '../../config/index.js';
import { getT } from '../../i18n/index.js';
export const languageKeyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback("🇺🇿 O'zbekcha", 'set_lang_uz'),
        Markup.button.callback('🇬🇧 English', 'set_lang_en'),
        Markup.button.callback('🇷🇺 Русский', 'set_lang_ru'),
    ],
]);
export function getMainKeyboard(lang) {
    const t = getT(lang);
    const publicBaseUrl = (config.WEBHOOK_DOMAIN ||
        config.RENDER_EXTERNAL_URL ||
        'https://tniq-rasm-bot.onrender.com').replace(/\/$/, '');
    const miniAppUrl = `${publicBaseUrl}/app`;
    const miniAppBtnText = lang === 'ru'
        ? '🚀 Открыть 4K Студию (Mini App)'
        : lang === 'en'
            ? '🚀 Launch 4K Studio (Mini App)'
            : '🚀 4K Studiyani Ochish (Mini App)';
    return Markup.keyboard([
        [Markup.button.webApp(miniAppBtnText, miniAppUrl)],
        [t.btn_image, t.btn_video],
        [t.btn_account, t.btn_usage],
        [t.btn_plans, t.btn_settings],
        [t.btn_restart, t.btn_help],
    ]).resize();
}
export function getSettingsKeyboard(lang) {
    const t = getT(lang);
    return Markup.inlineKeyboard([
        [Markup.button.callback(t.btn_language, 'settings_change_language')],
        [Markup.button.callback(t.btn_custom_bg, 'settings_pro_custom_bg')],
        [Markup.button.callback(t.btn_reset_bg, 'settings_reset_custom_bg')],
    ]);
}
export function getScaleSelectionKeyboard(lang) {
    const t = getT(lang);
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(t.btn_scale_2x, 'scale_2x'),
            Markup.button.callback(t.btn_scale_4x, 'scale_4x'),
        ],
        [Markup.button.callback(t.btn_cancel, 'cancel_action')],
    ]);
}
export function getVideoResolutionKeyboard(lang) {
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
//# sourceMappingURL=main.keyboard.js.map