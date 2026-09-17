import type { WalletTransactionItem } from '@/types';

export const walletSummary = {
  totalBalance: '248,967.83',
  available: '43,093.00',
  earning: '274,825.01',
  earningAllocation: '$614.93/$43,093.00',
  allocationProgress: 0.31,
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
