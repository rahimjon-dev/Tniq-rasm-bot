import { Context } from 'telegraf';
export declare class PaymentService {
    private static readonly starsProvider;
    /**
     * Free Public Beta Activation (100% Free):
     * Instantly grants PRO tier access without payment during the launch phase!
     */
    static activateFreeBetaPass(telegramId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Send Telegram Stars payment invoice
     */
    static sendStarsInvoice(telegramId: number, plan: 'PRO' | 'BUSINESS'): Promise<void>;
    /**
     * Handle Telegram Pre-Checkout Query (Server-side validation)
     */
    static handlePreCheckout(ctx: Context): Promise<void>;
    /**
     * Handle Successful Payment
     */
    static handleSuccessfulPayment(ctx: Context): Promise<void>;
}
export default PaymentService;
