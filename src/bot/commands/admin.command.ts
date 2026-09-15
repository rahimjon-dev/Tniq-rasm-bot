import { Context, Markup } from 'telegraf';
import AdminService from '../../services/admin.service.js';
import { UserPlan } from '../../types/user.types.js';

export const adminKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Tizim Statistikasi', 'admin_stats'),
    Markup.button.callback('📋 Ishlar Navbati', 'admin_jobs'),
  ],
  [
    Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
    Markup.button.callback('📢 Xabar Tarqatish', 'admin_broadcast_info'),
  ],
  [
    Markup.button.callback('🌐 Veb Admin Dashboard', 'admin_web_link'),
  ],
  [Markup.button.callback('❌ Panelni Yopish', 'cancel_action')],
]);

export async function handleAdminCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) {
    return; // Silently ignore non-admins
  }

  const adminText =
    `👑 <b>AI MEDIA UPSCALER — ADMINISTRATOR PANELI</b>\n\n` +
    `Xush kelibsiz, administrator! Quyidagi menyu orqali bot faoliyatini to'liq boshqarishingiz mumkin:\n\n` +
    `• <b>/stats</b> — Jonli tizim va navbat statistikasi\n` +
    `• <b>/broadcast &lt;xabar&gt;</b> — Barcha foydalanuvchilarga e'lon yuborish\n` +
    `• <b>/ban &lt;telegramId&gt;</b> — Foydalanuvchini bloklash\n` +
    `• <b>/unban &lt;telegramId&gt;</b> — Blokdan chiqarish\n` +
    `• <b>/setplan &lt;telegramId&gt; &lt;FREE|PRO|BUSINESS&gt;</b> — Qo'lda tarif berish`;

  await ctx.replyWithHTML(adminText, adminKeyboard);
}

export async function handleStatsCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) return;

  const stats = await AdminService.getSystemStats();

  const uptimeHours = (stats.server.uptimeSeconds / 3600).toFixed(1);
  const dbStatus = stats.queueStatus.databaseConnected ? '✅ Ulangan' : '⚠️ Offline/Kutilmoqda';
  const redisStatus = stats.queueStatus.redisConnected ? '✅ Ulangan' : '⚠️ Offline/Kutilmoqda';

  const statsText =
    `📊 <b>TIZIM VA MONITORING STATISTIKASI</b>\n\n` +
    `👥 <b>Foydalanuvchilar:</b> ${stats.totalUsers} ta\n` +
    `📁 <b>Jami qayta ishlangan fayllar:</b> ${stats.totalJobs} ta\n` +
    `  • 🖼 Rasmlar: ${stats.imageJobs} ta\n` +
    `  • 🎬 Videolar: ${stats.videoJobs} ta\n` +
    `  • ❌ Xatoliklar: ${stats.failedJobs} ta\n` +
    `  • 🎯 Muvaffaqiyat darajasi: <b>${stats.successRatePercent}%</b>\n\n` +
    `⏳ <b>BullMQ Navbat Holati:</b>\n` +
    `  • Rasm navbati: ${stats.queueStatus.imageWaiting} kutilmoqda | ${stats.queueStatus.imageActive} ishlanmoqda\n` +
    `  • Video navbati: ${stats.queueStatus.videoWaiting} kutilmoqda | ${stats.queueStatus.videoActive} ishlanmoqda\n\n` +
    `🖥 <b>Server Salomatligi:</b>\n` +
    `  • Database: ${dbStatus}\n` +
    `  • Redis Queue: ${redisStatus}\n` +
    `  • Uptime: ${uptimeHours} soat\n` +
    `  • RAM ishlatilishi: ${stats.server.memoryUsedMB} MB\n` +
    `  • CPU yadrolari: ${stats.server.cpuCores} ta`;

  await ctx.replyWithHTML(statsText, adminKeyboard);
}

export async function handleBroadcastCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) return;

  // @ts-ignore
  const text = ctx.message?.text || '';
  const messageToSend = text.replace(/^\/broadcast\s*/i, '').trim();

  if (!messageToSend) {
    await ctx.replyWithHTML(
      `📢 <b>Xabar tarqatish formati:</b>\n\n` +
      `<code>/broadcast Hurmatli foydalanuvchilar, botimizda yangi 4K imkoniyatlar qo'shildi!</code>`
    );
    return;
  }

  const statusMsg = await ctx.reply('⏳ <i>Xabar tarqatish boshlandi... Iltimos, kuting.</i>', {
    parse_mode: 'HTML',
  });

  const result = await AdminService.broadcastMessage(messageToSend);

  try {
    await ctx.deleteMessage(statusMsg.message_id);
  } catch {}

  await ctx.replyWithHTML(
    `📢 <b>Xabar tarqatish yakunlandi!</b>\n\n` +
    `• Jami foydalanuvchilar: ${result.total}\n` +
    `• Muvaffaqiyatli yetkazildi: ✅ <b>${result.sent}</b>\n` +
    `• Yetkazilmadi (bloklaganlar): ❌ ${result.failed}`
  );
}

export async function handleBanCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) return;

  // @ts-ignore
  const text = ctx.message?.text || '';
  const targetId = parseInt(text.split(' ')[1], 10);

  if (!targetId || isNaN(targetId)) {
    await ctx.reply('Format: /ban <telegramId>');
    return;
  }

  const ok = await AdminService.banUser(targetId);
  if (ok) {
    await ctx.reply(`✅ Foydalanuvchi (${targetId}) muvaffaqiyatli bloklandi.`);
  } else {
    await ctx.reply(`❌ Foydalanuvchini bloklashda xatolik yuz berdi.`);
  }
}

export async function handleUnbanCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) return;

  // @ts-ignore
  const text = ctx.message?.text || '';
  const targetId = parseInt(text.split(' ')[1], 10);

  if (!targetId || isNaN(targetId)) {
    await ctx.reply('Format: /unban <telegramId>');
    return;
  }

  const ok = await AdminService.unbanUser(targetId);
  if (ok) {
    await ctx.reply(`✅ Foydalanuvchi (${targetId}) blokdan chiqarildi.`);
  } else {
    await ctx.reply(`❌ Foydalanuvchini blokdan chiqarishda xatolik yuz berdi.`);
  }
}

export async function handleSetPlanCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId || !AdminService.isAdmin(telegramId)) return;

  // @ts-ignore
  const text = ctx.message?.text || '';
  const parts = text.split(' ').filter(Boolean);
  const targetId = parseInt(parts[1], 10);
  const plan = parts[2]?.toUpperCase() as UserPlan;

  if (!targetId || isNaN(targetId) || !['FREE', 'PRO', 'BUSINESS'].includes(plan)) {
    await ctx.reply('Format: /setplan <telegramId> <FREE|PRO|BUSINESS>');
    return;
  }

  const ok = await AdminService.setPlan(targetId, plan);
  if (ok) {
    await ctx.reply(`✅ Foydalanuvchiga (${targetId}) <b>${plan}</b> tarifi berildi.`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ Tarifni yangilashda xatolik yuz berdi.`);
  }
}
