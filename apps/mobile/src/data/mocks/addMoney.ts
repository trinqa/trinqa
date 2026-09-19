import type { AddMoneySourceOption } from '@/types';
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
