import { PaymentProvider, CreateInvoiceOptions } from './payment.interface.js';
export declare class TelegramStarsProvider implements PaymentProvider {
    readonly name = "telegram_stars";
    sendInvoice(options: CreateInvoiceOptions): Promise<void>;
}
export default TelegramStarsProvider;
