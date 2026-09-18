import type {
  PaymentCurrency,
  PaymentIntent,
  PaymentQuote,
  PaymentRecipient,
} from '@/types';

export const availablePaymentBalanceTry = 43093;

export const paymentRecipients: PaymentRecipient[] = [
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

export const paymentCurrencies: PaymentCurrency[] = ['TRY', 'USD', 'EUR'];
export const quickPaymentAmounts = [50, 100, 250] as const;

const currencyConfiguration: Record<
  PaymentCurrency,
  { exchangeRate: number; fee: number; routeId: string }
> = {
  TRY: { exchangeRate: 1, fee: 8.5, routeId: 'mock-auto-try' },
  USD: { exchangeRate: 34.85, fee: 16.5, routeId: 'mock-auto-usd' },
  EUR: { exchangeRate: 38.16, fee: 18.5, routeId: 'mock-auto-eur' },
};

export function createPaymentQuote(intent: PaymentIntent): PaymentQuote {
  const configuration = currencyConfiguration[intent.receiveCurrency];
  const debitAmount = intent.receiveAmount * configuration.exchangeRate;

  return {
    receiveAmount: intent.receiveAmount,
    receiveCurrency: intent.receiveCurrency,
    debitAmount,
    debitCurrency: 'TRY',
    fee: configuration.fee,
    exchangeRate: configuration.exchangeRate,
    estimatedArrival: '~1–2 min',
    routeId: configuration.routeId,
    hasSufficientAvailable:
      debitAmount + configuration.fee <= availablePaymentBalanceTry,
  };
}

export function maximumReceiveAmount(currency: PaymentCurrency) {
  const configuration = currencyConfiguration[currency];
  return Math.floor(
    (availablePaymentBalanceTry - configuration.fee) / configuration.exchangeRate,
  );
}
