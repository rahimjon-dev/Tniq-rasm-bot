import { Context } from 'telegraf';
import prisma from '../../database/prisma.js';
import UserService from '../user.service.js';
import TelegramStarsProvider from './telegram-stars.provider.js';
import logger from '../../utils/logger.js';
import { UserPlan } from '../../types/user.types.js';

export class PaymentService {
  private static readonly starsProvider = new TelegramStarsProvider();

  /**
   * Free Public Beta Activation (100% Free):
   * Instantly grants PRO tier access without payment during the launch phase!
   */
  static async activateFreeBetaPass(telegramId: number): Promise<{ success: boolean; message: string }> {
    const user = await UserService.findOrCreateUser({ telegramId });
    await UserService.upgradeUserSubscription(user.id, 'PRO', 60); // 60 days free

    logger.info(`[BETA_PRO_ACTIVATED] User=${user.id} (Telegram ID: ${telegramId}) upgraded to PRO (Free Launch Mode)`);

    return {
      success: true,
      message:
        `🎉 <b>Tabriklaymiz! Sizga BEPUL BETA PRO tarifi faollashtirildi!</b>\n\n` +
        `💎 <b>Yangi imkoniyatlaringiz:</b>\n` +
        `• 🖼 Kuniga <b>50 tagacha</b> rasm tiniqlashtirish (4x Ultra HD)\n` +
        `• 🎬 <b>4K Ultra HD</b> video qayta ishlash\n` +
        `• ⚡ Tezkor navbat va maksimal sifat\n\n` +
        `<i>Hozirgi ochiq beta davrida barcha premium imkoniyatlardan mutlaqo tekin foydalaning! 🚀</i>`,
    };
  }

  /**
   * Send Telegram Stars payment invoice
   */
  static async sendStarsInvoice(telegramId: number, plan: 'PRO' | 'BUSINESS'): Promise<void> {
    const user = await UserService.findOrCreateUser({ telegramId });

    if (plan === 'PRO') {
      await this.starsProvider.sendInvoice({
        userId: user.id,
        telegramChatId: telegramId,
        plan: 'PRO',
        title: '💎 Pro Plan (30 kun)',
        description: '50 ta rasm/kun (4x Ultra HD), 15 ta video/kun (4K format), tezkor navbat.',
        amountStars: 250, // 250 Telegram Stars (~$5)
      });
    } else {
      await this.starsProvider.sendInvoice({
        userId: user.id,
        telegramChatId: telegramId,
        plan: 'BUSINESS',
        title: '👑 Business Plan (30 kun)',
        description: 'Cheksiz rasmlar, 50 ta video/kun (4K 60FPS), VIP dedicated queue.',
        amountStars: 600, // 600 Telegram Stars (~$12)
      });
    }
  }

  /**
   * Handle Telegram Pre-Checkout Query (Server-side validation)
   */
  static async handlePreCheckout(ctx: Context): Promise<void> {
    // @ts-ignore
    const preCheckoutQuery = ctx.preCheckoutQuery;
    if (!preCheckoutQuery) return;

    logger.info(`[PRE_CHECKOUT] Validating payment query #${preCheckoutQuery.id} from user ${preCheckoutQuery.from.id}`);

    try {
      // Validate payload integrity
      const payload = JSON.parse(preCheckoutQuery.invoice_payload);
      if (!payload.userId || !payload.plan) {
        await ctx.answerPreCheckoutQuery(false, 'Xarid ma\'lumotlarida xatolik yuz berdi.');
        return;
      }

      // Approve checkout
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      logger.error('[PRE_CHECKOUT_ERROR]:', error);
      await ctx.answerPreCheckoutQuery(false, 'To\'lovni tekshirishda xatolik yuz berdi.');
    }
  }

  /**
   * Handle Successful Payment
   */
  static async handleSuccessfulPayment(ctx: Context): Promise<void> {
    // @ts-ignore
    const payment = ctx.message?.successful_payment;
    const telegramId = ctx.from?.id;

    if (!payment || !telegramId) return;

    logger.info(`[PAYMENT_SUCCESS] Received ${payment.total_amount} ${payment.currency} from user ${telegramId}`);

    try {
      const payload = JSON.parse(payment.invoice_payload);
      const plan: UserPlan = payload.plan || 'PRO';

      // 1. Upgrade user in database / memory
      await UserService.upgradeUserSubscription(payload.userId, plan, 30);

      // 2. Record Payment transaction
      try {
        await prisma.payment.create({
          data: {
            userId: payload.userId,
            provider: 'telegram_stars',
            transactionId: payment.telegram_payment_charge_id,
            amount: payment.total_amount,
            currency: payment.currency,
            status: 'COMPLETED',
            metadata: JSON.stringify(payment),
          },
        });
      } catch (err) {
        logger.debug('Database offline, payment logged in audit memory:', err);
      }

      // 3. Congratulate user
      await ctx.replyWithHTML(
        `🎉 <b>To'lovingiz muvaffaqiyatli qabul qilindi!</b>\n\n` +
        `💎 Sizning hisobingiz <b>${plan}</b> tarifiga muvaffaqiyatli oshirildi (30 kunga)!\n\n` +
        `• <b>Tranzaksiya ID:</b> <code>${payment.telegram_payment_charge_id}</code>\n` +
        `• <b>Miqdor:</b> ${payment.total_amount} ${payment.currency}\n\n` +
        `Endi barcha yuqori limitlar va 4K Ultra HD imkoniyatlari profilingizda faol! 🚀`
      );
    } catch (error) {
      logger.error('Error handling successful payment post-processing:', error);
      await ctx.reply('⚠️ To\'lov qabul qilindi, biroq hisobni yangilashda texnik muammo yuz berdi. Administrator bilan bog\'laning: @admin');
    }
  }
}

export default PaymentService;
