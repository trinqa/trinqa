import type { WithdrawalCurrency, WithdrawalDestination } from '@/types';
import { currenciesFor } from '@/data/capabilities';

export const withdrawalCurrencies = currenciesFor('withdraw') as WithdrawalCurrency[];
export const quickWithdrawalAmounts = [250, 500, 1000] as const;

export const withdrawalDestinations: WithdrawalDestination[] = [
  {
    id: 'garanti-4281',
    name: 'Garanti BBVA',
    detail: '•••• 4281',
    kind: 'bank',
    symbol: 'building.columns.fill',
  },
  {
    id: 'crypto-wallet',
    name: 'Crypto wallet',
    detail: 'Saved wallet address',
    kind: 'wallet',
    symbol: 'wallet.bifold',
  },
];
