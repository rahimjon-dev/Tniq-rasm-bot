// ==========================================
// 1. KERAKLI KUTUBXONALARNI YUKLASH
// ==========================================
require('dotenv').config(); // .env faylidagi o'zgaruvchilarni o'qish uchun
const { Telegraf, Markup } = require('telegraf'); // Telegram bot yaratish uchun
const sharp = require('sharp'); // Rasmlarga ishlov berish va tiniqlashtirish uchun

// .env faylidan BOT_TOKEN ni o'qiymiz
const botToken = process.env.BOT_TOKEN;

if (!botToken || botToken.includes('tokeningizni_yozing')) {
  console.error('❌ Xatolik: BOT_TOKEN topilmadi yoki noto\'g\'ri!');
  console.error("👉 Iltimos, .env faylini oching va bot tokeningizni to'g'ri kiriting.\n");
  process.exit(1);
}

// Bot obyektini yaratamiz
const bot = new Telegraf(botToken);

// ==========================================
// 2. DOIMIY PASTKI MENYU (REPLY KEYBOARD)
// ==========================================
const asosiyMenyu = Markup.keyboard([
  ['🖼 Rasm 4K qilish', '🎬 Video 4K qilish'],
  ['ℹ️ Bot haqida qisqacha', '🔄 Qayta ishga tushirish']
]).resize(); // .resize() tugmalarni ixcham va qulay qiladi

// ==========================================
// 3. /start VA QAYTA ISHGA TUSHIRISH
// ==========================================
const startXabari = async (ctx) => {
  const userName = ctx.from.first_name || 'Foydalanuvchi';
  await ctx.replyWithHTML(
    `Assalomu alaykum, <b>${userName}</b>! 👋\n\n` +
    `📸 <b>Tiniq Rasm & Video 4K</b> botiga xush kelibsiz!\n\n` +
    `Quyidagi menyudan kerakli bo'limni tanlang yoki to'g'ridan-to'g'ri rasm yuboring:`,
    asosiyMenyu
  );
};

// /start buyrug'i
bot.start(startXabari);

// "🔄 Qayta ishga tushirish" tugmasi bosilganda
bot.hears('🔄 Qayta ishga tushirish', startXabari);

// /menu buyrug'i berilganda
bot.command('menu', async (ctx) => {
  await ctx.replyWithHTML('📋 <b>Asosiy menyu ochildi:</b>', asosiyMenyu);
});

// ==========================================
// 4. MENYU TUGMALARI BOSILGANDA
// ==========================================

// "🖼 Rasm 4K qilish" tugmasi
bot.hears('🖼 Rasm 4K qilish', async (ctx) => {
  await ctx.replyWithHTML(
    `🖼 <b>Rasm 4K qilish rejimi:</b>\n\n` +
    `Menga xira, sifatsiz yoki tumanli rasmni yuboring.\n` +
    `Men uni kontrastini kuchaytirib, qirralarini o'tkirlab, 4K tiniq qilib beraman! ✨`,
    asosiyMenyu
  );
});

// "🎬 Video 4K qilish" tugmasi
bot.hears('🎬 Video 4K qilish', async (ctx) => {
  await ctx.replyWithHTML(
    `🎬 <b>Video 4K qilish rejimi:</b>\n\n` +
    `Menga qisqa video yoki video xabar (dumaloq video) yuboring.\n` +
    `Bot uni qabul qilib, 4K tiniqlashtirish uchun tahlil qiladi! 📹`,
    asosiyMenyu
  );
});

// "ℹ️ Bot haqida qisqacha" tugmasi
const botHaqidaXabari = async (ctx) => {
  const infoMatn = 
    `ℹ️ <b>Bot haqida qisqacha ma'lumot:</b>\n\n` +
    `🤖 <b>Nomi:</b> Tiniq Rasm & Video 4K Bot\n` +
    `⚡ <b>Imkoniyatlari:</b>\n` +
    `• 🖼 <b>Rasm 4K:</b> Xiralikni yo'qotish, detallarni o'tkirlash va tiniqlikni oshirish.\n` +
    `• 🎬 <b>Video 4K:</b> Videolarni qayta ishlash va sifatini yaxshilash.\n` +
    `• 🔄 <b>Qayta boshlash:</b> Xohlagan vaqt menyudan qayta start berish.\n\n` +
    `⏱ <b>Ishlash tezligi:</b> 1-3 soniya\n` +
    `🆓 <b>Foydalanish:</b> Bepul va cheklovlarsiz!`;

  await ctx.replyWithHTML(infoMatn, asosiyMenyu);
};

bot.hears('ℹ️ Bot haqida qisqacha', botHaqidaXabari);
bot.command('info', botHaqidaXabari);
bot.command('yordam', botHaqidaXabari);

// ==========================================
// 5. RASM QABUL QILISH VA TINIQLASHTIRISH (SHARP)
// ==========================================
bot.on('photo', async (ctx) => {
  try {
    // Foydalanuvchiga ishlov berish boshlanganini bildiramiz
    await ctx.reply('⏳ Rasmingiz qabul qilindi, 4K tiniqlashtirilmoqda...');

    // 1. Eng yuqori sifatli rasmni olamiz (massivning oxirgi elementi)
    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1];

    // 2. Telegram serveridan rasmning to'liq yuklab olish havolasini olamiz
    const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);

    // 3. Rasmni internet orqali yuklab olamiz va Buffer ko'rinishiga o'tkazamiz
    const response = await fetch(fileLink.href || fileLink);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 4. "sharp" kutubxonasi yordamida tiniqlashtiramiz:
    // - .sharpen() -> rasm konturlarini o'tkirlab, xiralikni ketkazadi
    // - .modulate({ contrast: 1.2 }) -> kontrastni 20% oshirib, ranglarni aniqroq ko'rsatadi
    const outputBuffer = await sharp(inputBuffer)
      .sharpen()
      .modulate({ contrast: 1.2 })
      .toBuffer();

    // 5. Tiniqlashtirilgan tayyor rasmni menyusi bilan birga qayta yuboramiz
    await ctx.replyWithPhoto(
      { source: outputBuffer },
      { 
        caption: '✨ <b>Mana, rasmingiz 4K tiniqlashtirildi!</b>\n\nYana boshqa rasm yoki video yuborishingiz mumkin.',
        parse_mode: 'HTML',
        ...asosiyMenyu
      }
    );

  } catch (error) {
    console.error('Rasmga ishlov berishda xatolik:', error);
    await ctx.reply('❌ Rasmni qayta ishlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.', asosiyMenyu);
  }
});

// Foydalanuvchi video yuborganda
bot.on(['video', 'video_note'], async (ctx) => {
  await ctx.replyWithHTML(
    `📹 <b>Videongiz qabul qilindi!</b>\n\n` +
    `Video 4K moduli hozirda test rejimida ishlamoqda. Tez orada to'liq formatda yangilanadi! 🚀`,
    asosiyMenyu
  );
});

// ==========================================
// 6. XATOLIKLARNI USHLASH (ERROR HANDLING)
// ==========================================
bot.catch((err, ctx) => {
  console.error(`❌ Botda xatolik:`, err);
});

// ==========================================
// 7. BOTNI ISHGA TUSHIRISH VA BUYRUQLARNI O'RNATISH
// ==========================================
bot.launch().catch((err) => {
  console.error('❌ Botni ishga tushirishda xatolik:', err);
});

// Telegram pastki "Menu" tugmachasini o'rnatamiz
bot.telegram.setMyCommands([
  { command: 'start', description: '🔄 Qayta ishga tushirish' },
  { command: 'menu', description: '📋 Asosiy menyuni ochish' },
  { command: 'info', description: 'ℹ️ Bot haqida qisqacha' },
  { command: 'yordam', description: '❓ Yordam' },
]).catch((err) => console.error('Menyu buyruqlarini sozlashda xatolik:', err));

bot.telegram.getMe().then((botInfo) => {
  console.log('===========================================');
  console.log(`🚀 @${botInfo.username} muvaffaqiyatli ishga tushdi!`);
  console.log('📱 Pastki menyu tugmalari faollashtirildi:');
  console.log('  [🖼 Rasm 4K qilish] [🎬 Video 4K qilish]');
  console.log('  [ℹ️ Bot haqida qisqacha] [🔄 Qayta ishga tushirish]');
  console.log('To\'xtatish uchun: terminalda Ctrl + C bosing');
  console.log('===========================================');
}).catch((err) => {
  console.error('Bot ma\'lumotlarini olishda xatolik:', err);
});

// Dasturni to'xtatishda botni toza yakunlash
const stopBot = (signal) => {
  try {
    bot.stop(signal);
  } catch (e) {}
};
process.once('SIGINT', () => stopBot('SIGINT'));
process.once('SIGTERM', () => stopBot('SIGTERM'));
