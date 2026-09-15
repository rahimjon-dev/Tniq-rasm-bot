import { UserPlan } from '../../types/user.types.js';

export interface CreateInvoiceOptions {
  userId: string;
  telegramChatId: number;
  plan: 'PRO' | 'BUSINESS';
  title: string;
  description: string;
  amountStars: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  provider: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
}

export interface PaymentProvider {
  readonly name: string;
  sendInvoice(options: CreateInvoiceOptions): Promise<void>;
}
