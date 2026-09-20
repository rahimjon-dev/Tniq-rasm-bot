export type Language = 'uz' | 'en' | 'ru';

export const translations = {
  uz: {
    choose_language:
      `🌐 <b>Assalomu alaykum! Iltimos, qulay tilni tanlang:</b>\n\n` +
      `🌐 <b>Hello! Please choose your preferred language:</b>\n\n` +
      `🌐 <b>Здравствуйте! Пожалуйста, выберите удобный язык:</b>`,
    language_selected: `✅ <b>O'zbek tili tanlandi!</b>`,
    welcome: (name: string) =>
      `🚀 <b>REMINI AI — 4K ULTRA HD BOT</b>\n\n` +
      `Xush kelibsiz, <b>${name}</b>!\n` +
      `Ilg'or chuqur neyron tarmoqlar (Real-ESRGAN & AI Engine) yordamida rasmlar va videolaringizni yuqori tiniqlikda (4K Ultra HD) qayta ishlang.\n\n` +
      `✨ <b>Asosiy imkoniyatlar:</b>\n` +
      `• <b>Rasmlar:</b> 2x HD va 4x Ultra HD yuz va tekstura tiklash.\n` +
      `• <b>Videolar:</b> 720p, 1080p va 4K gacha AI tiniqlashtirish (ovoz 100% saqlanadi).\n` +
      `• <b>Tezlik:</b> Rasmlar ~1 soniya, videolar ~5 soniya!\n\n` +
      `Pastdagi menyudan kerakli bo'limni tanlang yoki to'g'ridan-to'g'ri rasm/video yuboring:`,
    btn_image: '🎨 Rasm Tiniqlashtirish',
    btn_video: '🎬 Video Tiniqlashtirish',
    btn_account: '👤 Profilim',
    btn_usage: '📊 Limitlarim',
    btn_plans: '💎 Tariflar',
    btn_settings: '⚙️ Sozlamalar',
    btn_restart: '🔄 Botni qayta ishga tushirish',
    btn_help: '❓ Yordam',
    btn_language: '🌐 Tilni o\'zgartirish',
    btn_custom_bg: '🖼 Maxsus Fon (Pro)',
    btn_reset_bg: '🗑 Fonni tozalash',
    btn_back: '⬅️ Orqaga',

    image_mode: (maxMb: number) =>
      `🎨 <b>Rasm Tiniqlashtirish Rejimi</b>\n\n` +
      `Tiniqlashtirmoqchi bo'lgan rasmingizni yuboring (oddiy Rasm yoki sifatli Hujjat sifatida).\n\n` +
      `⚡ <i>Qo'llab-quvvatlanadi: JPG, PNG, WEBP (Hajmi ${maxMb}MB gacha)</i>`,
    video_mode: (maxMb: number, maxSec: number) =>
      `🎬 <b>Video Tiniqlashtirish Rejimi</b>\n\n` +
      `Tiniqlashtirmoqchi bo'lgan videongizni yuboring.\n\n` +
      `ℹ️ <i>Formatlar: MP4, MOV, MKV (Hajmi ${maxMb}MB gacha, davomiyligi ${maxSec}s gacha).</i>`,
    image_received: (w: number, h: number, rem: number | string, max: number | string) =>
      `📸 <b>Rasm qabul qilindi!</b>\n\n` +
      `📐 <b>Asl o'lchami:</b> ${w} × ${h} px\n` +
      `📊 <b>Bugungi limit:</b> ${rem} / ${max}\n\n` +
      `<b>AI kattalashtirish darajasini tanlang:</b>\n` +
      `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Juda tez)\n` +
      `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Maksimal tiniqlik)`,
    document_received: (w: number, h: number) =>
      `📁 <b>Sifatli Fayl (Hujjat) qabul qilindi!</b>\n\n` +
      `📐 <b>O'lchami:</b> ${w} × ${h} px\n\n` +
      `<b>AI kattalashtirish darajasini tanlang:</b>`,
    queued_image: (jobId: string, scale: number, w: number, h: number) =>
      `⏳ <b>AI navbatiga qo'shildi!</b>\n\n` +
      `• <b>Ish ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Kattalashtirish:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
      `• <b>AI Model:</b> Real-ESRGAN Ultra-Clarity\n\n` +
      `<i>Bir necha soniya ichida tayyor bo'ladi...</i>`,
    queued_video: (jobId: string, res: string, scale: number, duration: number, fps: number) =>
      `🎬 <b>Video AI navbatiga qo'shildi!</b>\n\n` +
      `• <b>Ish ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Sifat darajasi:</b> ${res} (${scale}x AI)\n` +
      `• <b>Davomiyligi:</b> ${duration.toFixed(1)}s (${fps} FPS)\n` +
      `• <b>Ovoz:</b> 100% asl sifatda saqlanadi\n\n` +
      `<i>Kadrlar qayta ishlanmoqda. Tayyor bo'lgach yuboriladi!</i>`,

    // Progressive Generation States
    stage_preparing: '⏳ <b>Tayyorlanmoqda...</b>',
    stage_generating: (scale: number | string) => `⚙️ <b>Tiniqlashtirilmoqda (${scale}x)...</b>`,
    stage_enhancing: '✨ <b>Sifat oshirilmoqda...</b>',
    stage_uploading: '📤 <b>Yuklanmoqda...</b>',
    stage_done: '✅ <b>Tayyor!</b>',

    complete_image: (scale: number, inRes: string, outRes: string, time: number) =>
      `✨ <b>AI Tiniqlashtirish Muvaffaqiyatli Yakunlandi!</b>\n\n` +
      `🔍 <b>Kattalashtirish:</b> ${scale}x Ultra HD\n` +
      `📏 <b>O'lchamlari:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
      `⚡ <b>Ishlov berish vaqti:</b> ${time.toFixed(1)} soniya\n` +
      `🧠 <b>AI Neyron Tarmoq:</b> Real-ESRGAN Ultra-Fast\n\n` +
      `<i>Telegram sifatni buzmasligi uchun asl fayl quyida yuborildi 👇</i>`,
    complete_video: (res: string, time: number) =>
      `✨ <b>Video Tiniqlashtirish Muvaffaqiyatli Yakunlandi!</b>\n\n` +
      `🎬 <b>Yangi format:</b> ${res} Ultra HD\n` +
      `⚡ <b>Ishlov berish vaqti:</b> ${time.toFixed(1)} soniya\n` +
      `🔊 <b>Ovoz:</b> 100% sinxron saqlangan`,

    account_info: (id: number | bigint, name: string, username: string, plan: string, total: number, date: string, hasCustomBg: boolean) =>
      `👤 <b>Foydalanuvchi Profili</b>\n\n` +
      `• <b>Telegram ID:</b> <code>${id}</code>\n` +
      `• <b>Ism:</b> ${name}\n` +
      `• <b>Username:</b> ${username ? `@${username}` : 'Mavjud emas'}\n` +
      `• <b>Tarif:</b> <b>${plan}</b>\n` +
      `• <b>Jami qayta ishlangan:</b> ${total} ta media\n` +
      `• <b>Maxsus Fon:</b> ${hasCustomBg ? 'O\'rnatilgan ✅' : 'Yo\'q'}\n` +
      `• <b>Ro'yxatdan o'tgan:</b> ${date}\n\n` +
      `✨ <i>Yuqori sifatli AI xizmatidan unumli foydalaning!</i>`,

    usage_info: (date: string, plan: string, imgUsed: number, imgMax: number | string, imgRem: number | string, vidUsed: number, vidMax: number | string, vidRem: number | string) =>
      `📊 <b>Bugungi foydalanish statistikasi (${date})</b>\n` +
      `🕒 <i>Vaqt mintaqasi: Asia/Tashkent (Har kuni 00:00 da yangilanadi)</i>\n\n` +
      `• <b>Joriy tarif:</b> <b>${plan}</b>\n` +
      `• <b>Rasmlar:</b> ${imgUsed} / ${imgMax} (${imgRem} qoldi)\n` +
      `• <b>Videolar:</b> ${vidUsed} / ${vidMax} (${vidRem} qoldi)\n\n` +
      `⚡ <i>Limitlarni oshirish yoki cheksiz imkoniyat uchun "Tariflar" bo'limiga qarang!</i>`,

    plans_info:
      `💎 <b>AI MEDIA UPSCALER — TARIF REJALARI</b>\n\n` +
      `🎁 <b>1. FREE (Standart)</b>\n` +
      `• Kuniga 50 ta rasm tiniqlashtirish\n` +
      `• Kuniga 10 ta video tiniqlashtirish\n` +
      `• 2x va 4x AI Ultra HD\n` +
      `• Narxi: 100% Bepul\n\n` +
      `⭐ <b>2. PREMIUM</b>\n` +
      `• Kuniga 70 ta rasm tiniqlashtirish\n` +
      `• Kuniga 30 ta video tiniqlashtirish\n` +
      `• 4K Video va ustuvor navbat\n` +
      `• Narxi: Bepul (Admin tasdiqlaydi)\n\n` +
      `👑 <b>3. PRO (Cheksiz & Shaxsiy Fon)</b>\n` +
      `• <b>CHEKSIZ</b> rasm tiniqlashtirish\n` +
      `• <b>CHEKSIZ</b> video tiniqlashtirish\n` +
      `• 🖼 <b>Chat va rasm orqa foniga xohlagan rasmni o'rnatish</b>\n` +
      `• 👑 <b>Alohida yonib turuvchi PRO znachogi</b>\n` +
      `• Maksimal VIP tezlik va 0 kutish vaqti\n\n` +
      `<i>Tarif olish yoki oshirish uchun admin bilan bog'laning: @rahmonoov_19</i>`,

    settings_menu: `⚙️ <b>Sozlamalar</b>\n\nKerakli parametrni tanlang:`,
    pro_custom_bg_prompt:
      `🖼 <b>Pro Maxsus Fon O'rnatish</b>\n\n` +
      `Iltimos, bot orqa foni sifatida foydalanmoqchi bo'lgan rasmingizni yuboring (JPG yoki PNG, 10MB gacha).\n\n` +
      `<i>Rasm sizning profilingizga saqlanadi va bot tajribangizni yanada chiroyli qiladi!</i>`,
    pro_only_feature:
      `🔒 <b>Ushbu funksiya faqat PRO foydalanuvchilar uchun!</b>\n\n` +
      `Maxsus fon o'rnatish imkoniyatidan foydalanish uchun <b>PRO</b> tarifiga ega bo'lishingiz kerak.\n` +
      `Tarifni olish uchun "💎 Tariflar" bo'limiga kiring!`,
    bg_saved_success: `✅ <b>Maxsus fon muvaffaqiyatli saqlandi!</b>\n\nFoningiz profilingizga biriktirildi va avtomatik ravishda faollashtirildi.`,
    bg_removed_success: `🗑 <b>Maxsus fon tozalandi va asl holatga qaytarildi.</b>`,
    restart_success:
      `🔄 <b>Bot muvaffaqiyatli yangilandi va ishga tushirildi!</b>\n\n` +
      `Hisobingiz, profilingiz, tilingiz va barcha statistikalaringiz xavfsiz saqlangan holda menyu yangilandi.`,

    limit_reached: (type: string, max: number | string) =>
      `⚠️ <b>Kunlik limitga yetildi!</b>\n\n` +
      `Siz bugun uchun belgilangan barcha (<b>${max} ta</b>) ${type} limitidan foydalandingiz.\n\n` +
      `Ertaga soat 00:00 da (Asia/Tashkent) limit avtomatik yangilanadi yoki <b>PRO</b> tarifiga o'tib cheksiz foydalaning!`,

    history_empty: `📜 <b>Ishlar Tarixi</b>\n\nSiz hali hech qanday media qayta ishlamagansiz.\nRasm yoki video yuborib sinab ko'ring! 🚀`,
    help_text:
      `ℹ️ <b>AI Media Upscaler Bot Haqida</b>\n\n` +
      `Ushbu bot eng ilg'or chuqur neyron tarmoqlar (Real-ESRGAN super-resolution) yordamida ` +
      `hira rasmlar va videolarning yetishmayotgan piksellarini qayta tiklaydi va tiniqlashtiradi.\n\n` +
      `💡 <b>Foydali tavsiyalar:</b>\n` +
      `1. Odamlar yuzi tushgan rasmlar uchun 4x Ultra HD tanlansa, yuz detallari juda tiniq chiqadi.\n` +
      `2. Rasmni sifatli <b>Hujjat (Document)</b> sifatida yuborsangiz, Telegram siqib sifatini buzmaydi.\n` +
      `3. Videolarda audio treklar to'liq va kechikishsiz saqlanadi.\n\n` +
      `Savollaringiz bo'lsa, adminga murojaat qiling: @rahmonoov_19`,
    btn_scale_2x: '⚡ 2x HD',
    btn_scale_4x: '✨ 4x Ultra HD',
    btn_cancel: '❌ Bekor qilish',
    btn_res_720: '📺 720p HD',
    btn_res_1080: '🎬 1080p Full HD',
    btn_res_2k: '💎 2K Quad HD',
    btn_res_4k: '👑 4K Ultra HD',

    doc_invalid_format: '⚠️ Iltimos, rasm formatidagi fayl yuboring (JPG, PNG, WebP).',
    doc_image_caption: '📁 <i>Asl sifatdagi fayl (100% Full Fidelity)</i>',
    doc_video_caption: '📁 <i>Asl sifatdagi video fayl (Document)</i>',
    process_image_error: (err: string) =>
      `❌ <b>AI Tiniqlashtirishda xatolik yuz berdi:</b>\n<code>${err}</code>\n\nIltimos boshqa rasm bilan qaytadan urinib ko'ring yoki adminga murojaat qiling.`,
    process_video_error: (err: string) =>
      `❌ <b>Video tiniqlashtirishda xatolik yuz berdi:</b>\n<code>${err}</code>\n\nIltimos qisqaroq video bilan qaytadan urinib ko'ring yoki adminga murojaat qiling.`,
    video_size_error: (maxMb: number) =>
      `⚠️ <b>Video hajmi juda katta!</b>\n\nBot hozirda maksimal <b>${maxMb}MB</b> gacha bo'lgan videolarni qabul qiladi.`,
    video_duration_error: (maxSec: number) =>
      `⚠️ <b>Video davomiyligi juda uzun!</b>\n\nMaksimal ruxsat etilgan davomiylik: <b>${maxSec} soniya</b>.`,
    video_received: (w: number, h: number, fps: number, dur: number, rem: number | string, max: number | string) =>
      `🎬 <b>Video qabul qilindi!</b>\n\n` +
      `📐 <b>Asl o'lchami:</b> ${w} × ${h} px (${fps} FPS)\n` +
      `⏱ <b>Davomiyligi:</b> ${dur.toFixed(1)} soniya\n` +
      `📊 <b>Bugungi qoldiq:</b> ${rem} / ${max}\n\n` +
      `<b>AI orqali qaysi sifat darajasiga ko'tarmoqchisiz?</b>`,
    callback_processing: '⏳ Qabul qilingan, ishlanmoqda...',
    callback_cancelled: '❌ Bekor qilindi',
    btn_feedback: '⭐️ Fikr bildirish',
    review_prompt_after_job: '⭐️ <b>Natija sizga yoqdimi?</b>\nBotimizni 1 dan 5 gacha yulduzcha bilan baholang va o\'z fikringizni qoldiring:',
    review_menu_prompt: '⭐️ <b>Botimiz xizmatini baholang!</b>\n\nQuyidagi tugmalar orqali 1 dan 5 gacha yulduzcha tanlang (eng balandi 5 ⭐):',
    review_rating_selected: (rating: number) =>
      `⭐️ Rahmat! Siz <b>${rating}/5 ⭐</b> baho tanladingiz.\n\n` +
      `✍️ <i>Bot haqida o'z fikr, taklif yoki tilaklaringizni yozib qoldiring (masalan: "Bot yaxshi omad!"):</i>\n\n` +
      `<i>(Agar izoh yozishni xohlamasangiz, /skip buyrug'ini bosing)</i>`,
    review_thanks: (rating: number) =>
      `✅ <b>Katta rahmat!</b> Sizning fikringiz va <b>${rating} ⭐</b> bahoyingiz qabul qilindi. Sizning fikringiz biz uchun juda muhim! ❤️`,
    review_thanks_no_comment: (rating: number) =>
      `✅ <b>Rahmat!</b> Sizning <b>${rating} ⭐</b> bahoyingiz qabul qilindi! ❤️`,
    review_skip_hint: '💡 Siz izoh yozishni o\'tkazib yubordingiz.',
  },

  en: {
    choose_language:
      `🌐 <b>Hello! Please choose your preferred language:</b>\n\n` +
      `Tap one of the buttons below:`,
    language_selected: `✅ <b>English language selected!</b>`,
    welcome: (name: string) =>
      `🚀 <b>REMINI AI — 4K ULTRA HD BOT</b>\n\n` +
      `Welcome, <b>${name}</b>!\n` +
      `Enhance your images and videos up to 4K Ultra HD using cutting-edge deep neural network AI.\n\n` +
      `✨ <b>Key Capabilities:</b>\n` +
      `• <b>Images:</b> True 2x and 4x AI super-resolution with facial & texture restoration.\n` +
      `• <b>Videos:</b> Upscale to 720p, 1080p, and 4K with 100% audio fidelity.\n` +
      `• <b>Lightning Speed:</b> ~1s for images, ~5s for videos!\n\n` +
      `Select an option from the menu below or send an image/video directly:`,
    btn_image: '🎨 Upscale Image',
    btn_video: '🎬 Upscale Video',
    btn_account: '👤 My Profile',
    btn_usage: '📊 My Usage',
    btn_plans: '💎 Plans',
    btn_settings: '⚙️ Settings',
    btn_restart: '🔄 Restart Bot',
    btn_help: '❓ Help',
    btn_language: '🌐 Change Language',
    btn_custom_bg: '🖼 Custom Background (Pro)',
    btn_reset_bg: '🗑 Reset Background',
    btn_back: '⬅️ Back',

    image_mode: (maxMb: number) =>
      `🎨 <b>Image Upscale Mode</b>\n\n` +
      `Please send me the image you want to enhance (as a standard Photo or uncompressed Document).\n\n` +
      `⚡ <i>Supported: JPG, PNG, WEBP (Up to ${maxMb}MB)</i>`,
    video_mode: (maxMb: number, maxSec: number) =>
      `🎬 <b>Video Upscale Mode</b>\n\n` +
      `Please send me the video you wish to upscale.\n\n` +
      `ℹ️ <i>Supported formats: MP4, MOV, MKV (Up to ${maxMb}MB, max ${maxSec}s).</i>`,
    image_received: (w: number, h: number, rem: number | string, max: number | string) =>
      `📸 <b>Image Received!</b>\n\n` +
      `📐 <b>Current Dimensions:</b> ${w} × ${h} px\n` +
      `📊 <b>Remaining Today:</b> ${rem} / ${max}\n\n` +
      `<b>Select your AI upscale factor:</b>\n` +
      `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Ultra Fast)\n` +
      `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Maximum Crispness)`,
    document_received: (w: number, h: number) =>
      `📁 <b>Uncompressed Document Received!</b>\n\n` +
      `📐 <b>Resolution:</b> ${w} × ${h} px\n\n` +
      `<b>Select your AI upscale factor:</b>`,
    queued_image: (jobId: string, scale: number, w: number, h: number) =>
      `⏳ <b>Added to AI Processing Queue!</b>\n\n` +
      `• <b>Job ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Target Scale:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
      `• <b>Engine:</b> Real-ESRGAN Neural Network\n\n` +
      `<i>Your enhanced image will be sent in a few seconds...</i>`,
    queued_video: (jobId: string, res: string, scale: number, duration: number, fps: number) =>
      `🎬 <b>Added Video to AI Processing Queue!</b>\n\n` +
      `• <b>Job ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Target:</b> ${res} (${scale}x AI Super-Resolution)\n` +
      `• <b>Duration:</b> ${duration.toFixed(1)}s (${fps} FPS)\n` +
      `• <b>Audio:</b> 100% synchronized\n\n` +
      `<i>Processing frames now. You will receive the video automatically when done!</i>`,

    stage_preparing: '⏳ <b>Preparing...</b>',
    stage_generating: (scale: number | string) => `⚙️ <b>Generating (${scale}x)...</b>`,
    stage_enhancing: '✨ <b>Enhancing details...</b>',
    stage_uploading: '📤 <b>Uploading...</b>',
    stage_done: '✅ <b>Done!</b>',

    complete_image: (scale: number, inRes: string, outRes: string, time: number) =>
      `✨ <b>AI Super-Resolution Complete!</b>\n\n` +
      `🔍 <b>Scale:</b> ${scale}x Ultra HD\n` +
      `📏 <b>Dimensions:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
      `⚡ <b>Processing Time:</b> ${time.toFixed(1)}s\n` +
      `🧠 <b>AI Model:</b> Real-ESRGAN Ultra-Fast\n\n` +
      `<i>Original quality document file sent below 👇</i>`,
    complete_video: (res: string, time: number) =>
      `✨ <b>AI Video Upscaling Complete!</b>\n\n` +
      `🎬 <b>Output:</b> ${res} Ultra HD\n` +
      `⚡ <b>Processing Time:</b> ${time.toFixed(1)}s\n` +
      `🔊 <b>Audio:</b> 100% synchronized`,

    account_info: (id: number | bigint, name: string, username: string, plan: string, total: number, date: string, hasCustomBg: boolean) =>
      `👤 <b>User Profile & Account</b>\n\n` +
      `• <b>Telegram ID:</b> <code>${id}</code>\n` +
      `• <b>Name:</b> ${name}\n` +
      `• <b>Username:</b> ${username ? `@${username}` : 'Not set'}\n` +
      `• <b>Plan:</b> <b>${plan}</b>\n` +
      `• <b>Total Processed:</b> ${total} media jobs\n` +
      `• <b>Custom Background:</b> ${hasCustomBg ? 'Active ✅' : 'None'}\n` +
      `• <b>Member Since:</b> ${date}\n\n` +
      `✨ <i>Enjoy your AI media enhancement privileges!</i>`,

    usage_info: (date: string, plan: string, imgUsed: number, imgMax: number | string, imgRem: number | string, vidUsed: number, vidMax: number | string, vidRem: number | string) =>
      `📊 <b>Today's Resource Usage (${date})</b>\n` +
      `🕒 <i>Timezone: Asia/Tashkent (Resets daily at 00:00)</i>\n\n` +
      `• <b>Current Plan:</b> <b>${plan}</b>\n` +
      `• <b>Image Upscales:</b> ${imgUsed} / ${imgMax} (${imgRem} remaining)\n` +
      `• <b>Video Upscales:</b> ${vidUsed} / ${vidMax} (${vidRem} remaining)\n\n` +
      `⚡ <i>Check out the "Plans" menu for unlimited access!</i>`,

    plans_info:
      `💎 <b>AI MEDIA UPSCALER — SUBSCRIPTION PLANS</b>\n\n` +
      `🎁 <b>1. FREE Plan</b>\n` +
      `• 50 Image generations / day\n` +
      `• 10 Video generations / day\n` +
      `• 2x and 4x AI Ultra HD\n` +
      `• Price: 100% Free\n\n` +
      `⭐ <b>2. PREMIUM Plan</b>\n` +
      `• 70 Image generations / day\n` +
      `• 30 Video generations / day\n` +
      `• 4K Video & priority queue\n` +
      `• Price: Free (Granted by Admin)\n\n` +
      `👑 <b>3. PRO Plan (Unlimited & Custom Background)</b>\n` +
      `• <b>UNLIMITED</b> Image generations\n` +
      `• <b>UNLIMITED</b> Video generations\n` +
      `• 🖼 <b>Custom Background personalization</b>\n` +
      `• 👑 <b>Glowing animated PRO badge</b>\n` +
      `• Maximum VIP speed\n\n` +
      `<i>Contact the administrator to activate or upgrade plans: @rahmonoov_19</i>`,

    settings_menu: `⚙️ <b>Settings</b>\n\nChoose an option to configure:`,
    pro_custom_bg_prompt:
      `🖼 <b>Pro Custom Background</b>\n\n` +
      `Please send the image you would like to set as your custom bot background (JPG or PNG, up to 10MB).\n\n` +
      `<i>This image will be saved to your profile and personalise your bot experience!</i>`,
    pro_only_feature:
      `🔒 <b>This feature is exclusive to PRO users!</b>\n\n` +
      `To set a custom background, you need an active <b>PRO</b> plan.\n` +
      `Check out the "💎 Plans" menu to learn more!`,
    bg_saved_success: `✅ <b>Custom background successfully saved!</b>\n\nYour background is now active and linked to your profile.`,
    bg_removed_success: `🗑 <b>Custom background reset to default.</b>`,
    restart_success:
      `🔄 <b>Bot interface successfully restarted!</b>\n\n` +
      `Your account, language, subscription plan, and usage statistics remain completely intact.`,

    limit_reached: (type: string, max: number | string) =>
      `⚠️ <b>Daily Limit Reached!</b>\n\n` +
      `You have exhausted all (<b>${max}</b>) ${type} generations for today.\n\n` +
      `Limits reset at 00:00 (Asia/Tashkent), or upgrade to <b>PRO</b> for unlimited access!`,

    history_empty: `📜 <b>Processing History</b>\n\nYou have not processed any media yet.\nSend an image or video to get started! 🚀`,
    help_text:
      `ℹ️ <b>About AI Media Upscaler</b>\n\n` +
      `Our bot utilizes state-of-the-art Deep Neural Networks (Real-ESRGAN) ` +
      `to mathematically reconstruct missing details, remove compression artifacts, and eliminate blur.\n\n` +
      `💡 <b>Pro Tips:</b>\n` +
      `1. For photos with faces, 4x Ultra HD yields crisp portrait features.\n` +
      `2. Send files as <b>Document</b> to prevent lossy compression.\n` +
      `3. Videos are processed frame-by-frame with full audio preservation.\n\n` +
      `Need help? Contact support: @rahmonoov_19`,
    btn_scale_2x: '⚡ 2x HD Upscale',
    btn_scale_4x: '✨ 4x Ultra HD',
    btn_cancel: '❌ Cancel',
    btn_res_720: '📺 720p HD',
    btn_res_1080: '🎬 1080p Full HD',
    btn_res_2k: '💎 2K Quad HD',
    btn_res_4k: '👑 4K Ultra HD',

    doc_invalid_format: '⚠️ Please send an image file (JPG, PNG, WebP).',
    doc_image_caption: '📁 <i>Original quality uncompressed file (100% Full Fidelity)</i>',
    doc_video_caption: '📁 <i>Original quality video file (Document)</i>',
    process_image_error: (err: string) =>
      `❌ <b>Error during AI upscaling:</b>\n<code>${err}</code>\n\nPlease try again with another image or contact admin.`,
    process_video_error: (err: string) =>
      `❌ <b>Error during video upscaling:</b>\n<code>${err}</code>\n\nPlease try again with a shorter video or contact admin.`,
    video_size_error: (maxMb: number) =>
      `⚠️ <b>Video file size is too large!</b>\n\nThe bot supports videos up to <b>${maxMb}MB</b>.`,
    video_duration_error: (maxSec: number) =>
      `⚠️ <b>Video duration is too long!</b>\n\nMaximum allowed duration is <b>${maxSec} seconds</b>.`,
    video_received: (w: number, h: number, fps: number, dur: number, rem: number | string, max: number | string) =>
      `🎬 <b>Video received!</b>\n\n` +
      `📐 <b>Source resolution:</b> ${w} × ${h} px (${fps} FPS)\n` +
      `⏱ <b>Duration:</b> ${dur.toFixed(1)}s\n` +
      `📊 <b>Today's remaining:</b> ${rem} / ${max}\n\n` +
      `<b>Select your target AI quality:</b>`,
    callback_processing: '⏳ Processing your request...',
    callback_cancelled: '❌ Cancelled',
    btn_feedback: '⭐️ Leave Feedback',
    review_prompt_after_job: '⭐️ <b>Did you like the result?</b>\nRate our bot from 1 to 5 stars and share your feedback:',
    review_menu_prompt: '⭐️ <b>Rate our AI service!</b>\n\nChoose 1 to 5 stars using the buttons below (5 ⭐ is highest):',
    review_rating_selected: (rating: number) =>
      `⭐️ Thank you! You selected <b>${rating}/5 ⭐</b>.\n\n` +
      `✍️ <i>Please write your comments, feedback, or wishes (e.g., "Great bot, keep it up!"):</i>\n\n` +
      `<i>(If you do not wish to write a comment, click /skip)</i>`,
    review_thanks: (rating: number) =>
      `✅ <b>Thank you so much!</b> Your feedback and <b>${rating} ⭐</b> rating have been recorded. Your opinion matters to us! ❤️`,
    review_thanks_no_comment: (rating: number) =>
      `✅ <b>Thank you!</b> Your <b>${rating} ⭐</b> rating has been recorded! ❤️`,
    review_skip_hint: '💡 You skipped leaving a comment.',
  },

  ru: {
    choose_language:
      `🌐 <b>Пожалуйста, выберите удобный язык:</b>\n\n` +
      `Нажмите на одну из кнопок ниже:`,
    language_selected: `✅ <b>Выбран русский язык!</b>`,
    welcome: (name: string) =>
      `🚀 <b>REMINI AI — 4K ULTRA HD BOT</b>\n\n` +
      `Добро пожаловать, <b>${name}</b>!\n` +
      `Улучшайте качество фото и видео до 4K Ultra HD с помощью передовых нейросетей.\n\n` +
      `✨ <b>Основные возможности:</b>\n` +
      `• <b>Фото:</b> ИИ-увеличение 2x HD и 4x Ultra HD с восстановлением лиц и текстур.\n` +
      `• <b>Видео:</b> Улучшение до 720p, 1080p и 4K со 100% сохранением звука.\n` +
      `• <b>Скорость:</b> Фото ~1 секунда, видео ~5 секунд!\n\n` +
      `Выберите нужный раздел в меню или просто отправьте фото/видео:`,
    btn_image: '🎨 Улучшить фото',
    btn_video: '🎬 Улучшить видео',
    btn_account: '👤 Мой профиль',
    btn_usage: '📊 Мои лимиты',
    btn_plans: '💎 Тарифы',
    btn_settings: '⚙️ Настройки',
    btn_restart: '🔄 Перезапустить бота',
    btn_help: '❓ Помощь',
    btn_language: '🌐 Сменить язык',
    btn_custom_bg: '🖼 Свой фон (Pro)',
    btn_reset_bg: '🗑 Сбросить фон',
    btn_back: '⬅️ Назад',

    image_mode: (maxMb: number) =>
      `🎨 <b>Режим улучшения фото</b>\n\n` +
      `Отправьте фото, которое хотите улучшить (как фото или файл без сжатия).\n\n` +
      `⚡ <i>Форматы: JPG, PNG, WEBP (до ${maxMb}МБ)</i>`,
    video_mode: (maxMb: number, maxSec: number) =>
      `🎬 <b>Режим улучшения видео</b>\n\n` +
      `Отправьте видеоролик для улучшения качества.\n\n` +
      `ℹ️ <i>Форматы: MP4, MOV, MKV (до ${maxMb}МБ, длина до ${maxSec} сек).</i>`,
    image_received: (w: number, h: number, rem: number | string, max: number | string) =>
      `📸 <b>Фото получено!</b>\n\n` +
      `📐 <b>Исходный размер:</b> ${w} × ${h} px\n` +
      `📊 <b>Остаток на сегодня:</b> ${rem} / ${max}\n\n` +
      `<b>Выберите коэффициент увеличения ИИ:</b>\n` +
      `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Очень быстро)\n` +
      `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Максимальная чёткость)`,
    document_received: (w: number, h: number) =>
      `📁 <b>Файл без сжатия получен!</b>\n\n` +
      `📐 <b>Разрешение:</b> ${w} × ${h} px\n\n` +
      `<b>Выберите коэффициент увеличения ИИ:</b>`,
    queued_image: (jobId: string, scale: number, w: number, h: number) =>
      `⏳ <b>Добавлено в очередь ИИ!</b>\n\n` +
      `• <b>ID задачи:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Масштаб:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
      `• <b>Нейросеть:</b> Real-ESRGAN\n\n` +
      `<i>Обработка займёт несколько секунд...</i>`,
    queued_video: (jobId: string, res: string, scale: number, duration: number, fps: number) =>
      `🎬 <b>Видео добавлено в очередь ИИ!</b>\n\n` +
      `• <b>ID задачи:</b> <code>${jobId.slice(0, 8)}</code>\n` +
      `• <b>Цель:</b> ${res} (${scale}x AI)\n` +
      `• <b>Длина:</b> ${duration.toFixed(1)}с (${fps} FPS)\n` +
      `• <b>Звук:</b> 100% синхронизирован\n\n` +
      `<i>Кадры обрабатываются. Готовое видео будет отправлено автоматически!</i>`,

    stage_preparing: '⏳ <b>Подготовка...</b>',
    stage_generating: (scale: number | string) => `⚙️ <b>Обработка (${scale}x)...</b>`,
    stage_enhancing: '✨ <b>Улучшение деталей...</b>',
    stage_uploading: '📤 <b>Загрузка...</b>',
    stage_done: '✅ <b>Готово!</b>',

    complete_image: (scale: number, inRes: string, outRes: string, time: number) =>
      `✨ <b>ИИ-увеличение успешно завершено!</b>\n\n` +
      `🔍 <b>Масштаб:</b> ${scale}x Ultra HD\n` +
      `📏 <b>Разрешение:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
      `⚡ <b>Время обработки:</b> ${time.toFixed(1)} сек\n` +
      `🧠 <b>Нейросеть:</b> Real-ESRGAN Ultra-Fast\n\n` +
      `<i>Файл в исходном качестве отправлен ниже 👇</i>`,
    complete_video: (res: string, time: number) =>
      `✨ <b>Улучшение видео успешно завершено!</b>\n\n` +
      `🎬 <b>Новый формат:</b> ${res} Ultra HD\n` +
      `⚡ <b>Время обработки:</b> ${time.toFixed(1)} сек\n` +
      `🔊 <b>Звук:</b> 100% сохранён`,

    account_info: (id: number | bigint, name: string, username: string, plan: string, total: number, date: string, hasCustomBg: boolean) =>
      `👤 <b>Профиль пользователя</b>\n\n` +
      `• <b>Telegram ID:</b> <code>${id}</code>\n` +
      `• <b>Имя:</b> ${name}\n` +
      `• <b>Username:</b> ${username ? `@${username}` : 'Не указан'}\n` +
      `• <b>Тариф:</b> <b>${plan}</b>\n` +
      `• <b>Всего обработано:</b> ${total} медиа\n` +
      `• <b>Свой фон:</b> ${hasCustomBg ? 'Установлен ✅' : 'Нет'}\n` +
      `• <b>Дата регистрации:</b> ${date}\n\n` +
      `✨ <i>Наслаждайтесь всеми возможностями нейросети!</i>`,

    usage_info: (date: string, plan: string, imgUsed: number, imgMax: number | string, imgRem: number | string, vidUsed: number, vidMax: number | string, vidRem: number | string) =>
      `📊 <b>Статистика использования (${date})</b>\n` +
      `🕒 <i>Часовой пояс: Asia/Tashkent (Сброс каждый день в 00:00)</i>\n\n` +
      `• <b>Текущий тариф:</b> <b>${plan}</b>\n` +
      `• <b>Фото:</b> ${imgUsed} / ${imgMax} (${imgRem} осталось)\n` +
      `• <b>Видео:</b> ${vidUsed} / ${vidMax} (${vidRem} осталось)\n\n` +
      `⚡ <i>Для безлимитного доступа ознакомьтесь с разделом «Тарифы»!</i>`,

    plans_info:
      `💎 <b>AI MEDIA UPSCALER — ТАРИФНЫЕ ПЛАНЫ</b>\n\n` +
      `🎁 <b>1. FREE (Базовый)</b>\n` +
      `• 50 генераций фото / день\n` +
      `• 10 генераций видео / день\n` +
      `• 2x и 4x AI Ultra HD\n` +
      `• Цена: 100% Бесплатно\n\n` +
      `⭐ <b>2. PREMIUM</b>\n` +
      `• 70 генераций фото / день\n` +
      `• 30 генераций видео / день\n` +
      `• 4K Видео и приоритет в очереди\n` +
      `• Цена: Бесплатно (Выдает администратор)\n\n` +
      `👑 <b>3. PRO (Безлимит и Свой Фон)</b>\n` +
      `• <b>БЕЗЛИМИТНОЕ</b> улучшение фото\n` +
      `• <b>БЕЗЛИМИТНОЕ</b> улучшение видео\n` +
      `• 🖼 <b>Установка персонального фона на фото и в чат</b>\n` +
      `• 👑 <b>Светящийся анимированный PRO значок</b>\n` +
      `• Максимальная скорость VIP без задержек\n\n` +
      `<i>Для получения или повышения тарифа свяжитесь с администратором: @rahmonoov_19</i>`,

    settings_menu: `⚙️ <b>Настройки</b>\n\nВыберите нужный параметр:`,
    pro_custom_bg_prompt:
      `🖼 <b>Установка персонального фона (PRO)</b>\n\n` +
      `Пожалуйста, отправьте изображение, которое вы хотите установить в качестве фона (JPG или PNG, до 10МБ).\n\n` +
      `<i>Изображение будет сохранено в вашем профиле!</i>`,
    pro_only_feature:
      `🔒 <b>Эта функция доступна только для пользователей PRO!</b>\n\n` +
      `Чтобы установить свой фон, необходим тариф <b>PRO</b>.\n` +
      `Подробнее в разделе «💎 Тарифы»!`,
    bg_saved_success: `✅ <b>Персональный фон успешно сохранён!</b>\n\nФон привязан к вашему профилю и активирован.`,
    bg_removed_success: `🗑 <b>Фон сброшен до стандартного.</b>`,
    restart_success:
      `🔄 <b>Бот успешно перезапущен!</b>\n\n` +
      `Ваш аккаунт, выбранный язык, тарифный план и статистика использования сохранены.`,

    limit_reached: (type: string, max: number | string) =>
      `⚠️ <b>Достигнут дневной лимит!</b>\n\n` +
      `Вы использовали все (<b>${max}</b>) генераций ${type} на сегодня.\n\n` +
      `Лимиты обновятся в 00:00 (Asia/Tashkent), или перейдите на <b>PRO</b> для безлимита!`,

    history_empty: `📜 <b>История обработки</b>\n\nВы ещё ничего не обрабатывали.\nОтправьте фото или видео, чтобы начать! 🚀`,
    help_text:
      `ℹ️ <b>О боте AI Media Upscaler</b>\n\n` +
      `Бот использует передовые нейросети (Real-ESRGAN) ` +
      `для восстановления недостающих деталей, устранения шума и размытия на фото и видео.\n\n` +
      `💡 <b>Полезные советы:</b>\n` +
      `1. Для портретов и фото с лицами выбирайте 4x Ultra HD — черты лица будут максимально чёткими.\n` +
      `2. Отправляйте фото как <b>Файл (Документ)</b>, чтобы Telegram не ухудшал качество.\n` +
      `3. При улучшении видео звук сохраняется без рассинхрона.\n\n` +
      `Поддержка: @rahmonoov_19`,
    btn_scale_2x: '⚡ 2x HD',
    btn_scale_4x: '✨ 4x Ultra HD',
    btn_cancel: '❌ Отмена',
    btn_res_720: '📺 720p HD',
    btn_res_1080: '🎬 1080p Full HD',
    btn_res_2k: '💎 2K Quad HD',
    btn_res_4k: '👑 4K Ultra HD',

    doc_invalid_format: '⚠️ Пожалуйста, отправьте файл изображения (JPG, PNG, WebP).',
    doc_image_caption: '📁 <i>Файл в оригинальном качестве (100% Full Fidelity)</i>',
    doc_video_caption: '📁 <i>Видеофайл в оригинальном качестве (Документ)</i>',
    process_image_error: (err: string) =>
      `❌ <b>Произошла ошибка при улучшении:</b>\n<code>${err}</code>\n\nПожалуйста, попробуйте другое изображение или обратитесь к администратору.`,
    process_video_error: (err: string) =>
      `❌ <b>Произошла ошибка при улучшении видео:</b>\n<code>${err}</code>\n\nПожалуйста, попробуйте более короткое видео или обратитесь к администратору.`,
    video_size_error: (maxMb: number) =>
      `⚠️ <b>Размер видео слишком велик!</b>\n\nБот принимает видео объёмом до <b>${maxMb}МБ</b>.`,
    video_duration_error: (maxSec: number) =>
      `⚠️ <b>Видео слишком длинное!</b>\n\nМаксимальная длительность: <b>${maxSec} секунд</b>.`,
    video_received: (w: number, h: number, fps: number, dur: number, rem: number | string, max: number | string) =>
      `🎬 <b>Видео получено!</b>\n\n` +
      `📐 <b>Исходный размер:</b> ${w} × ${h} px (${fps} FPS)\n` +
      `⏱ <b>Длительность:</b> ${dur.toFixed(1)}с\n` +
      `📊 <b>Остаток на сегодня:</b> ${rem} / ${max}\n\n` +
      `<b>Выберите желаемое качество улучшения:</b>`,
    callback_processing: '⏳ Обрабатывается...',
    callback_cancelled: '❌ Отменено',
    btn_feedback: '⭐️ Оставить отзыв',
    review_prompt_after_job: '⭐️ <b>Вам понравился результат?</b>\nОцените бота от 1 до 5 звёзд и оставьте ваш отзыв:',
    review_menu_prompt: '⭐️ <b>Оцените наш ИИ-сервис!</b>\n\nВыберите от 1 до 5 звёзд с помощью кнопок ниже (максимум 5 ⭐):',
    review_rating_selected: (rating: number) =>
      `⭐️ Спасибо! Вы поставили <b>${rating}/5 ⭐</b>.\n\n` +
      `✍️ <i>Напишите ваш отзыв, пожелания или предложения (например: "Бот отличный, успехов!"):</i>\n\n` +
      `<i>(Если не хотите писать отзыв, нажмите /skip)</i>`,
    review_thanks: (rating: number) =>
      `✅ <b>Большое спасибо!</b> Ваш отзыв и оценка <b>${rating} ⭐</b> успешно сохранены. Ваше мнение очень важно для нас! ❤️`,
    review_thanks_no_comment: (rating: number) =>
      `✅ <b>Спасибо!</b> Ваша оценка <b>${rating} ⭐</b> успешно сохранена! ❤️`,
    review_skip_hint: '💡 Вы пропустили ввод комментария.',
  },
};

export function getT(lang?: string | null) {
  const selected = (lang && (lang === 'uz' || lang === 'en' || lang === 'ru')) ? lang : 'uz';
  return translations[selected as Language];
}
