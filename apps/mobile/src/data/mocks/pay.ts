import type {
  PaymentCurrency,
  PaymentIntent,
  PaymentQuote,
  PaymentRecipient,
} from '@/types';
import { currenciesFor } from '@/data/capabilities';
import { calculateBalanceContribution } from '@/domain/balance';
import { mockTryRates, roundMoney } from '@/domain/money';

export const paymentRecipients: PaymentRecipient[] = [
  {
    id: 'ana-souza',
    name: 'Ana Souza',
    detail: 'Brazil',
    country: 'Brazil',
    preferredCurrency: 'BRL',
    symbol: 'person.fill',
  },
  {
    id: 'maria',
    name: 'Maria',
    detail: 'Recent contact',
    symbol: 'person.fill',
  },
  {
    id: 'alex',
    name: 'Alex',
    detail: 'Recent contact',
    symbol: 'person.fill',
  },
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    detail: 'Merchant',
    symbol: 'cup.and.saucer.fill',
  },
];

export const paymentCurrencies = currenciesFor('pay') as PaymentCurrency[];
export const quickPaymentAmounts = [500, 2000, 10000] as const;

const currencyConfiguration: Record<
  PaymentCurrency,
  { fee: number; routeId: string }
> = {
  TRY: { fee: 15, routeId: 'mock-auto-try' },
  USD: { fee: 35, routeId: 'mock-auto-usd' },
  EUR: { fee: 35, routeId: 'mock-auto-eur' },
  BRL: { fee: 25, routeId: 'mock-auto-brl' },
};

export function createPaymentQuote(
  intent: PaymentIntent,
  balances: { available: number; earning: number },
): PaymentQuote {
  const configuration = currencyConfiguration[intent.receiveCurrency];
  const exchangeRate = mockTryRates[intent.receiveCurrency];
  const debitAmount = roundMoney(
    intent.receiveAmount * exchangeRate + configuration.fee,
  );
  const contribution = calculateBalanceContribution(debitAmount, balances);
  const quoteUnavailable = intent.receiveAmount === 404;

  return {
    receiveAmount: intent.receiveAmount,
    receiveCurrency: intent.receiveCurrency,
    debitAmount,
    debitCurrency: 'TRY',
    fee: configuration.fee,
    exchangeRate,
    estimatedArrival: '~1–2 min',
    routeId: configuration.routeId,
    ...contribution,
    status: quoteUnavailable ? 'unavailable' : 'ready',
  };
}

export function maximumReceiveAmount(
  currency: PaymentCurrency,
  totalBalanceTry: number,
) {
  const configuration = currencyConfiguration[currency];
  return Math.floor(
    Math.max(0, totalBalanceTry - configuration.fee) / mockTryRates[currency],
  );
}
