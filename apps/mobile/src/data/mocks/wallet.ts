import type { WalletTransactionItem } from '@/types';

export const walletSummary = {
  totalBalance: '248,967.83',
  paymentNext: '43,093.00',
  paymentCompleted: '274,825.01',
  todayLimit: '$614.93/$43,093.00',
  limitProgress: 0.31,
} as const;

export const walletTransactions: WalletTransactionItem[] = [
  {
    id: 'amazon',
    title: 'Amazon.com',
    date: 'Nov 18, 2025',
    amount: '$89.71',
    time: '9:17 AM',
    brand: 'amazon',
    group: 'today',
  },
  {
    id: 'temu',
    title: 'Temu.com',
    date: 'Sep 13, 2025',
    amount: '$30.45',
    time: '8:49 PM',
    brand: 'temu',
    group: 'today',
  },
  {
    id: 'apple',
    title: 'Apple.com',
    date: 'Sep 12, 2025',
    amount: '$261.92',
    time: '9:33 AM',
    brand: 'apple',
    group: 'yesterday',
  },
];
