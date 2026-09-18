import type { AddMoneyQuote, AddMoneySourceOption } from '@/types';
import type { CurrencyCode } from '@/types';
import { currenciesFor } from '@/data/capabilities';

export const addMoneySources: AddMoneySourceOption[] = [
  {
    id: 'bank',
    title: 'Bank transfer',
    subtitle: 'Local currency transfer',
    symbol: 'building.columns.fill',
  },
  {
    id: 'card',
    title: 'Debit / card',
    subtitle: 'Add with a supported card',
    symbol: 'creditcard.fill',
  },
  {
    id: 'wallet',
    title: 'Crypto / wallet',
    subtitle: 'Transfer from another wallet',
    symbol: 'wallet.bifold.fill',
  },
  {
    id: 'receive',
    title: 'Receive',
    subtitle: 'QR and account details',
    symbol: 'qrcode',
  },
];

export const quickAddMoneyAmounts = [1000, 5000, 10000] as const;
export const addMoneyCurrencies = currenciesFor('deposit');

const MOCK_FEE: Record<CurrencyCode, number> = {
  TRY: 12.5,
  USD: 0.5,
  EUR: 0.5,
  BRL: 2.5,
};

export function createAddMoneyQuote(
  amount: number,
  currency: CurrencyCode,
): AddMoneyQuote {
  const fee = MOCK_FEE[currency];
  return {
    amount,
    currency,
    receivedAmount: Math.max(0, amount - fee),
    receivedCurrency: currency,
    exchangeRate: 1,
    fee,
    estimatedTime: '~1–2 min',
  };
}
