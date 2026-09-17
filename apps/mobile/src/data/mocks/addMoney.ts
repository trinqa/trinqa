import type { AddMoneyQuote, AddMoneySourceOption } from '@/types';

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
];

export const quickAddMoneyAmounts = [1000, 5000, 10000] as const;

const MOCK_EXCHANGE_RATE = 38;
const MOCK_FEE = 12.5;

export function createAddMoneyQuote(amount: number): AddMoneyQuote {
  return {
    amount,
    currency: 'TRY',
    receivedAmount: amount / MOCK_EXCHANGE_RATE,
    receivedCurrency: 'USDC',
    exchangeRate: MOCK_EXCHANGE_RATE,
    fee: MOCK_FEE,
    estimatedTime: '~1–2 min',
  };
}
