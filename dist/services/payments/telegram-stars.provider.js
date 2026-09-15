import { bot } from '../../bot/bot.instance.js';
import logger from '../../utils/logger.js';
export class TelegramStarsProvider {
    name = 'telegram_stars';
    async sendInvoice(options) {
        const { telegramChatId, title, description, amountStars, plan, userId } = options;
        logger.info(`[PAYMENT] Creating Telegram Stars invoice: ${plan} for User=${userId} (${amountStars} Stars)`);
        // In Telegram Bot API, Telegram Stars currency is "XTR"
        await bot.telegram.sendInvoice(telegramChatId, {
            title,
            description,
            payload: JSON.stringify({
                userId,
                plan,
                createdAt: Date.now(),
            }),
            provider_token: '', // Must be empty string for Telegram Stars!
            currency: 'XTR',
            prices: [
                {
                    label: `${title} (30 days)`,
                    amount: amountStars,
                },
            ],
        });
    }
}
export default TelegramStarsProvider;
//# sourceMappingURL=telegram-stars.provider.js.map