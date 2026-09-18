import type { WalletTransactionItem } from '@/types';

export const walletSummary = {
  totalBalance: '12,480.32',
  available: '4,220.14',
  earning: '8,260.18',
  earningAllocation: '$8,260.18/$12,480.32',
  allocationProgress: 0.66,
} as const;

export const walletTransactions: WalletTransactionItem[] = [
  {
    id: 'deposit',
    title: 'Deposit',
    detail: 'Bank transfer',
    amount: '+$10,000',
    time: '10:24 AM',
    symbol: 'building.columns.fill',
    iconStyle: 'neutral',
    group: 'today',
  },
  {
    id: 'added-to-earning',
    title: 'Added to earning',
    detail: 'Balanced strategy',
    amount: '+$5,000',
    time: '8:12 AM',
    symbol: 'arrow.triangle.2.circlepath',
    iconStyle: 'accent',
    group: 'today',
  },
  {
    id: 'withdrawal',
    title: 'Withdrawal',
    detail: 'Bank transfer',
    amount: '-$2,000',
    time: '4:18 PM',
    symbol: 'arrow.down',
    iconStyle: 'neutral',
    group: 'yesterday',
  },
  {
    id: 'returned-to-available',
    title: 'Returned to available',
    detail: 'From earning',
    amount: '+$1,250',
    time: '9:42 AM',
    symbol: 'arrow.uturn.backward',
    iconStyle: 'neutral',
    group: 'yesterday',
  },
];
