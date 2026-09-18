import type { CurrencyCode, PaymentQuote, TransactionType } from '@/types';

interface PaymentQaFixture {
  id: string;
  debitCurrency: CurrencyCode;
  receiveCurrency: CurrencyCode;
  receiveAmount: number;
  balanceCase: 'available' | 'earn-unwind' | 'insufficient' | 'quote-error';
  expectedStatus?: PaymentQuote['status'] | 'pending' | 'completed';
}

export const paymentQaFixtures: readonly PaymentQaFixture[] = [
  { id: 'try-try', debitCurrency: 'TRY', receiveCurrency: 'TRY', receiveAmount: 500, balanceCase: 'available' },
  { id: 'try-eur', debitCurrency: 'TRY', receiveCurrency: 'EUR', receiveAmount: 50, balanceCase: 'available' },
  { id: 'try-brl', debitCurrency: 'TRY', receiveCurrency: 'BRL', receiveAmount: 500, balanceCase: 'available' },
  { id: 'usd-eur', debitCurrency: 'USD', receiveCurrency: 'EUR', receiveAmount: 50, balanceCase: 'available' },
  { id: 'earn-unwind', debitCurrency: 'TRY', receiveCurrency: 'BRL', receiveAmount: 2000, balanceCase: 'earn-unwind' },
  { id: 'insufficient', debitCurrency: 'TRY', receiveCurrency: 'EUR', receiveAmount: 5000, balanceCase: 'insufficient' },
  { id: 'completed', debitCurrency: 'TRY', receiveCurrency: 'TRY', receiveAmount: 100, balanceCase: 'available', expectedStatus: 'completed' },
  { id: 'pending', debitCurrency: 'TRY', receiveCurrency: 'EUR', receiveAmount: 25, balanceCase: 'available', expectedStatus: 'pending' },
  { id: 'failed-quote', debitCurrency: 'TRY', receiveCurrency: 'BRL', receiveAmount: 404, balanceCase: 'quote-error', expectedStatus: 'unavailable' },
] as const;

export const transactionQaTypes: readonly TransactionType[] = [
  'withdrawal',
  'received',
  'added-to-earning',
  'yield-earned',
] as const;
