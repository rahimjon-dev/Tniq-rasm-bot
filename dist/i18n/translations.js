export const translations = {
    uz: {
        choose_language: `🌐 <b>Assalomu alaykum! Iltimos, o'zingizga qulay tilni tanlang:</b>\n\n` +
            `🌐 <b>Hello! Please choose your preferred language:</b>\n\n` +
            `🌐 <b>Здравствуйте! Пожалуйста, выберите удобный язык:</b>`,
        language_selected: `✅ <b>O'zbek tili tanlandi!</b>`,
        welcome: (name) => `🚀 <b>AI MEDIA UPSCALER</b>\n\n` +
            `Xush kelibsiz, <b>${name}</b>!\n` +
            `Neyron tarmoq (Real-ESRGAN) orqali rasmlar va videolaringizni yuqori tiniqlikda qayta ishlang.\n\n` +
            `✨ <b>Asosiy imkoniyatlar:</b>\n` +
            `• <b>Rasmlar:</b> 2x HD va 4x Ultra HD haqiqiy AI tiniqlashtirish.\n` +
            `• <b>Videolar:</b> 720p, 1080p, 2K va 4K gacha AI tiniqlashtirish (ovoz saqlanadi).\n\n` +
            `Pastdagi menyudan kerakli bo'limni tanlang yoki to'g'ridan-to'g'ri rasm/video yuboring:`,
        btn_image: '🖼 Rasm Tiniqlashtirish',
        btn_video: '🎬 Video Tiniqlashtirish',
        btn_account: '👤 Profilim',
        btn_history: '📜 Tarix',
        btn_usage: '📊 Limitlar',
        btn_language: '🌐 Tilni o\'zgartirish',
        btn_help: 'ℹ️ Yordam',
        image_mode: (maxMb) => `🖼 <b>Rasm Tiniqlashtirish Rejimi</b>\n\n` +
            `Tiniqlashtirmoqchi bo'lgan rasmingizni yuboring (oddiy Rasm yoki sifatli Fayl sifatida).\n\n` +
            `⚡ <i>Qo'llab-quvvatlanadi: JPG, PNG, WEBP (Hajmi ${maxMb}MB gacha)</i>`,
        video_mode: (maxMb, maxSec) => `🎬 <b>Video Tiniqlashtirish Rejimi</b>\n\n` +
            `Tiniqlashtirmoqchi bo'lgan videongizni yuboring.\n\n` +
            `ℹ️ <i>Formatlar: MP4, MOV, MKV (Hajmi ${maxMb}MB gacha, davomiyligi ${maxSec}s gacha).</i>`,
        image_received: (w, h, rem, max) => `📸 <b>Rasm qabul qilindi!</b>\n\n` +
            `📐 <b>Asl o'lchami:</b> ${w} × ${h} px\n` +
            `📊 <b>Bugungi qoldiq:</b> ${rem} / ${max}\n\n` +
            `<b>AI kattalashtirish darajasini tanlang:</b>\n` +
            `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Juda tez)\n` +
            `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Maksimal tiniqlik)`,
        document_received: (w, h) => `📁 <b>Sifatli Fayl (Hujjat) qabul qilindi!</b>\n\n` +
            `📐 <b>O'lchami:</b> ${w} × ${h} px\n\n` +
            `<b>AI kattalashtirish darajasini tanlang:</b>`,
        queued_image: (jobId, scale, w, h) => `⏳ <b>AI navbatiga qo'shildi!</b>\n\n` +
            `• <b>Ish ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Kattalashtirish:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
            `• <b>AI Model:</b> Real-ESRGAN Neyron Tarmog'i\n\n` +
            `<i>Bir necha soniya ichida tayyor bo'ladi...</i>`,
        queued_video: (jobId, res, scale, duration, fps) => `🎬 <b>Video AI navbatiga qo'shildi!</b>\n\n` +
            `• <b>Ish ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Sifat darajasi:</b> ${res} (${scale}x AI)\n` +
            `• <b>Davomiyligi:</b> ${duration.toFixed(1)}s (${fps} FPS)\n` +
            `• <b>Ovoz:</b> 100% asl sifatda saqlanadi\n\n` +
            `<i>Kadrlar qayta ishlanmoqda. Tayyor bo'lgach avtomatik yuboriladi!</i>`,
        processing_image: (scale) => `🤖 <b>AI orqali rasm tiniqlashtirilmoqda (${scale}x)...</b> ⏳\n<i>(Neyron tarmoq piksellarni tiklamoqda, 3-5 soniya kuting)</i>`,
        processing_video: (res) => `🎬 <b>Video kadrlari AI orqali tiniqlashtirilmoqda (${res})...</b> ⏳\n<i>(Har bir kadr neyron tarmoqdan o'tkazilmoqda)</i>`,
        complete_image: (scale, inRes, outRes, time) => `✨ <b>AI Tiniqlashtirish Muvaffaqiyatli Yakunlandi!</b>\n\n` +
            `🔍 <b>Kattalashtirish:</b> ${scale}x Ultra HD\n` +
            `📏 <b>O'lchamlari:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
            `⚡ <b>Ishlov berish vaqti:</b> ${time.toFixed(1)} soniya\n` +
            `🧠 <b>AI Neyron Tarmoq:</b> Real-ESRGAN (Vulkan GPU)\n\n` +
            `<i>Telegram sifatni buzmasligi uchun asl fayl quyida yuborildi 👇</i>`,
        complete_video: (res, time) => `✨ <b>Video Tiniqlashtirish Muvaffaqiyatli Yakunlandi!</b>\n\n` +
            `🎬 <b>Yangi format:</b> ${res} Ultra HD\n` +
            `⚡ <b>Ishlov berish vaqti:</b> ${time.toFixed(1)} soniya\n` +
            `🔊 <b>Ovoz:</b> 100% sinxron saqlangan`,
        account_info: (id, name, username, total, date) => `👤 <b>Foydalanuvchi Profili</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${id}</code>\n` +
            `• <b>Ism:</b> ${name}\n` +
            `• <b>Username:</b> ${username ? `@${username}` : 'Mavjud emas'}\n` +
            `• <b>Holat:</b> Bepul va Cheksiz Foydalanish ✅\n` +
            `• <b>Jami qayta ishlangan:</b> ${total} ta media\n` +
            `• <b>Ro'yxatdan o'tgan:</b> ${date}\n\n` +
            `✨ <i>Barcha AI funksiyalari siz uchun to'liq ochiq va bepul!</i>`,
        usage_info: (date, imgUsed, imgMax, imgRem, vidUsed, vidMax, vidRem) => `📊 <b>Bugungi foydalanish statistikasi (${date})</b>\n\n` +
            `• <b>Rasmlar:</b> ${imgUsed} / ${imgMax} ishlatildi (${imgRem} qoldi)\n` +
            `• <b>Videolar:</b> ${vidUsed} / ${vidMax} ishlatildi (${vidRem} qoldi)\n\n` +
            `⚡ <i>Barcha xizmatlar to'liq bepul va yuqori tezlikda ishlamoqda!</i>`,
        history_empty: `📜 <b>Ishlar Tarixi</b>\n\nSiz hali hech qanday media qayta ishlamagansiz.\nRasm yoki video yuborib sinab ko'ring! 🚀`,
        help_text: `ℹ️ <b>AI Media Upscaler Bot Haqida</b>\n\n` +
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
    },
    en: {
        choose_language: `🌐 <b>Please choose your preferred language:</b>\n\n` +
            `Tap one of the buttons below:`,
        language_selected: `✅ <b>English language selected!</b>`,
        welcome: (name) => `🚀 <b>AI MEDIA UPSCALER</b>\n\n` +
            `Welcome, <b>${name}</b>!\n` +
            `Enhance your images and videos using cutting-edge deep neural network AI (Real-ESRGAN).\n\n` +
            `✨ <b>Key Features:</b>\n` +
            `• <b>Images:</b> True 2x and 4x super-resolution with facial & texture restoration.\n` +
            `• <b>Videos:</b> AI upscaling to 720p, 1080p, 2K, and 4K with audio preservation.\n\n` +
            `Select an option below or send an image/video directly to begin:`,
        btn_image: '🖼 Upscale Image',
        btn_video: '🎬 Upscale Video',
        btn_account: '👤 My Account',
        btn_history: '📜 History',
        btn_usage: '📊 My Usage',
        btn_language: '🌐 Change Language',
        btn_help: 'ℹ️ Help',
        image_mode: (maxMb) => `🖼 <b>Image Upscale Mode</b>\n\n` +
            `Please send me the image you want to enhance (as a standard Photo or uncompressed Document).\n\n` +
            `⚡ <i>Supported: JPG, PNG, WEBP (Up to ${maxMb}MB)</i>`,
        video_mode: (maxMb, maxSec) => `🎬 <b>Video Upscale Mode</b>\n\n` +
            `Please send me the video you wish to upscale.\n\n` +
            `ℹ️ <i>Supported formats: MP4, MOV, MKV (Up to ${maxMb}MB, max ${maxSec}s).</i>`,
        image_received: (w, h, rem, max) => `📸 <b>Image Received!</b>\n\n` +
            `📐 <b>Current Dimensions:</b> ${w} × ${h} px\n` +
            `📊 <b>Remaining Today:</b> ${rem} / ${max}\n\n` +
            `<b>Select your AI upscale factor:</b>\n` +
            `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Fast)\n` +
            `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Maximum Detail)`,
        document_received: (w, h) => `📁 <b>Uncompressed Document Received!</b>\n\n` +
            `📐 <b>Resolution:</b> ${w} × ${h} px\n\n` +
            `<b>Select your AI upscale factor:</b>`,
        queued_image: (jobId, scale, w, h) => `⏳ <b>Added to AI Processing Queue!</b>\n\n` +
            `• <b>Job ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Target Scale:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
            `• <b>Engine:</b> Real-ESRGAN Neural Network\n\n` +
            `<i>Your enhanced image will be sent as soon as it completes.</i>`,
        queued_video: (jobId, res, scale, duration, fps) => `🎬 <b>Added Video to AI Processing Queue!</b>\n\n` +
            `• <b>Job ID:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Target:</b> ${res} (${scale}x AI Super-Resolution)\n` +
            `• <b>Duration:</b> ${duration.toFixed(1)}s (${fps} FPS)\n` +
            `• <b>Audio:</b> 100% synchronized\n\n` +
            `<i>Processing frames now. You will receive the final video automatically when done!</i>`,
        processing_image: (scale) => `🤖 <b>AI Image Upscaling in Progress (${scale}x)...</b> ⏳\n<i>(Neural network is reconstructing details, please wait a few seconds)</i>`,
        processing_video: (res) => `🎬 <b>AI Video Upscaling in Progress (${res})...</b> ⏳\n<i>(Deep neural network is processing frames)</i>`,
        complete_image: (scale, inRes, outRes, time) => `✨ <b>AI Super-Resolution Complete!</b>\n\n` +
            `🔍 <b>Scale:</b> ${scale}x Ultra HD\n` +
            `📏 <b>Dimensions:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
            `⚡ <b>Processing Time:</b> ${time.toFixed(1)}s\n` +
            `🧠 <b>AI Model:</b> Real-ESRGAN (Vulkan GPU)\n\n` +
            `<i>Original quality document file sent below 👇</i>`,
        complete_video: (res, time) => `✨ <b>AI Video Upscaling Complete!</b>\n\n` +
            `🎬 <b>Output:</b> ${res} Ultra HD\n` +
            `⚡ <b>Processing Time:</b> ${time.toFixed(1)}s\n` +
            `🔊 <b>Audio:</b> 100% synchronized`,
        account_info: (id, name, username, total, date) => `👤 <b>User Profile & Account</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${id}</code>\n` +
            `• <b>Name:</b> ${name}\n` +
            `• <b>Username:</b> ${username ? `@${username}` : 'Not set'}\n` +
            `• <b>Status:</b> Free & Unlimited Access ✅\n` +
            `• <b>Total Processed:</b> ${total} media jobs\n` +
            `• <b>Member Since:</b> ${date}\n\n` +
            `✨ <i>All AI features are completely active and free for you!</i>`,
        usage_info: (date, imgUsed, imgMax, imgRem, vidUsed, vidMax, vidRem) => `📊 <b>Today's Resource Usage (${date})</b>\n\n` +
            `• <b>Image Upscales:</b> ${imgUsed} / ${imgMax} used (${imgRem} left)\n` +
            `• <b>Video Upscales:</b> ${vidUsed} / ${vidMax} used (${vidRem} left)\n\n` +
            `⚡ <i>All services are currently free at maximum speed!</i>`,
        history_empty: `📜 <b>Processing History</b>\n\nYou have not processed any media yet.\nSend an image or video to get started! 🚀`,
        help_text: `ℹ️ <b>About AI Media Upscaler</b>\n\n` +
            `Our bot utilizes state-of-the-art Deep Neural Networks (Real-ESRGAN) ` +
            `to mathematically reconstruct missing details, remove compression artifacts, and eliminate blur.\n\n` +
            `💡 <b>Pro Tips for Best Results:</b>\n` +
            `1. For photos with faces, 4x Ultra HD yields crisp portrait features.\n` +
            `2. Send files as <b>Document</b> to prevent Telegram's compression from softening input.\n` +
            `3. Videos are processed frame-by-frame, keeping audio synchronized.\n\n` +
            `Need help? Contact support: @rahmonoov_19`,
        btn_scale_2x: '⚡ 2x HD Upscale',
        btn_scale_4x: '✨ 4x Ultra HD',
        btn_cancel: '❌ Cancel',
        btn_res_720: '📺 720p HD',
        btn_res_1080: '🎬 1080p Full HD',
        btn_res_2k: '💎 2K Quad HD',
        btn_res_4k: '👑 4K Ultra HD',
    },
    ru: {
        choose_language: `🌐 <b>Пожалуйста, выберите удобный язык:</b>\n\n` +
            `Нажмите на одну из кнопок ниже:`,
        language_selected: `✅ <b>Выбран русский язык!</b>`,
        welcome: (name) => `🚀 <b>AI MEDIA UPSCALER</b>\n\n` +
            `Добро пожаловать, <b>${name}</b>!\n` +
            `Улучшайте качество фото и видео с помощью нейросети Real-ESRGAN.\n\n` +
            `✨ <b>Основные возможности:</b>\n` +
            `• <b>Фото:</b> Настоящее ИИ-увеличение 2x HD и 4x Ultra HD с восстановлением деталей.\n` +
            `• <b>Видео:</b> Улучшение до 720p, 1080p, 2K и 4K с сохранением звука.\n\n` +
            `Выберите нужный раздел в меню или просто отправьте фото/видео:`,
        btn_image: '🖼 Улучшить фото',
        btn_video: '🎬 Улучшить видео',
        btn_account: '👤 Мой профиль',
        btn_history: '📜 История',
        btn_usage: '📊 Лимиты',
        btn_language: '🌐 Сменить язык',
        btn_help: 'ℹ️ Помощь',
        image_mode: (maxMb) => `🖼 <b>Режим улучшения фото</b>\n\n` +
            `Отправьте фото, которое хотите улучшить (как фото или файл без сжатия).\n\n` +
            `⚡ <i>Форматы: JPG, PNG, WEBP (до ${maxMb}МБ)</i>`,
        video_mode: (maxMb, maxSec) => `🎬 <b>Режим улучшения видео</b>\n\n` +
            `Отправьте видеоролик для улучшения качества.\n\n` +
            `ℹ️ <i>Форматы: MP4, MOV, MKV (до ${maxMb}МБ, длина до ${maxSec} сек).</i>`,
        image_received: (w, h, rem, max) => `📸 <b>Фото получено!</b>\n\n` +
            `📐 <b>Исходный размер:</b> ${w} × ${h} px\n` +
            `📊 <b>Остаток на сегодня:</b> ${rem} / ${max}\n\n` +
            `<b>Выберите коэффициент увеличения ИИ:</b>\n` +
            `• <b>2x HD:</b> ${w * 2} × ${h * 2} px (Быстро)\n` +
            `• <b>4x Ultra HD:</b> ${w * 4} × ${h * 4} px (Максимальная чёткость)`,
        document_received: (w, h) => `📁 <b>Файл без сжатия получен!</b>\n\n` +
            `📐 <b>Разрешение:</b> ${w} × ${h} px\n\n` +
            `<b>Выберите коэффициент увеличения ИИ:</b>`,
        queued_image: (jobId, scale, w, h) => `⏳ <b>Добавлено в очередь ИИ!</b>\n\n` +
            `• <b>ID задачи:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Масштаб:</b> ${scale}x (${w * scale} × ${h * scale} px)\n` +
            `• <b>Нейросеть:</b> Real-ESRGAN\n\n` +
            `<i>Обработка займёт несколько секунд...</i>`,
        queued_video: (jobId, res, scale, duration, fps) => `🎬 <b>Видео добавлено в очередь ИИ!</b>\n\n` +
            `• <b>ID задачи:</b> <code>${jobId.slice(0, 8)}</code>\n` +
            `• <b>Цель:</b> ${res} (${scale}x AI)\n` +
            `• <b>Длина:</b> ${duration.toFixed(1)}с (${fps} FPS)\n` +
            `• <b>Звук:</b> 100% синхронизирован\n\n` +
            `<i>Кадры обрабатываются. Готовое видео будет отправлено автоматически!</i>`,
        processing_image: (scale) => `🤖 <b>ИИ улучшает фото (${scale}x)...</b> ⏳\n<i>(Нейросеть восстанавливает пиксели, подождите несколько секунд)</i>`,
        processing_video: (res) => `🎬 <b>ИИ улучшает видео (${res})...</b> ⏳\n<i>(Кадры обрабатываются нейросетью)</i>`,
        complete_image: (scale, inRes, outRes, time) => `✨ <b>ИИ-увеличение успешно завершено!</b>\n\n` +
            `🔍 <b>Масштаб:</b> ${scale}x Ultra HD\n` +
            `📏 <b>Разрешение:</b> ${inRes} ➔ <b>${outRes} px</b>\n` +
            `⚡ <b>Время обработки:</b> ${time.toFixed(1)} сек\n` +
            `🧠 <b>Нейросеть:</b> Real-ESRGAN (Vulkan GPU)\n\n` +
            `<i>Файл в исходном качестве отправлен ниже 👇</i>`,
        complete_video: (res, time) => `✨ <b>Улучшение видео успешно завершено!</b>\n\n` +
            `🎬 <b>Новый формат:</b> ${res} Ultra HD\n` +
            `⚡ <b>Время обработки:</b> ${time.toFixed(1)} сек\n` +
            `🔊 <b>Звук:</b> 100% сохранён`,
        account_info: (id, name, username, total, date) => `👤 <b>Профиль пользователя</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${id}</code>\n` +
            `• <b>Имя:</b> ${name}\n` +
            `• <b>Username:</b> ${username ? `@${username}` : 'Не указан'}\n` +
            `• <b>Статус:</b> Бесплатный неограниченный доступ ✅\n` +
            `• <b>Всего обработано:</b> ${total} медиа\n` +
            `• <b>Дата регистрации:</b> ${date}\n\n` +
            `✨ <i>Все ИИ-функции полностью открыты и бесплатны для вас!</i>`,
        usage_info: (date, imgUsed, imgMax, imgRem, vidUsed, vidMax, vidRem) => `📊 <b>Статистика использования за сегодня (${date})</b>\n\n` +
            `• <b>Фото:</b> ${imgUsed} / ${imgMax} использовано (${imgRem} осталось)\n` +
            `• <b>Видео:</b> ${vidUsed} / ${vidMax} использовано (${vidRem} осталось)\n\n` +
            `⚡ <i>Все сервисы работают на максимальной скорости и бесплатно!</i>`,
        history_empty: `📜 <b>История обработки</b>\n\nВы ещё ничего не обрабатывали.\nОтправьте фото или видео, чтобы начать! 🚀`,
        help_text: `ℹ️ <b>О боте AI Media Upscaler</b>\n\n` +
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
    },
};
export function getT(lang) {
    const selected = (lang && (lang === 'uz' || lang === 'en' || lang === 'ru')) ? lang : 'uz';
    return translations[selected];
}
//# sourceMappingURL=translations.js.map