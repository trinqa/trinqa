import type { PaymentCurrency, PaymentRecipient } from '@/types';
import { currenciesFor } from '@/data/capabilities';

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
