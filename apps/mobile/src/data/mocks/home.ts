import type { AccountSummary, ActivityItem } from '@/types';

export const homeAccountSummary: AccountSummary = {
  accountName: 'Trinqa Account',
  cardLabel: 'Account Balance',
  balance: '43,093.00',
  displayCurrency: '$',
};

export const homeRecentActivity: ActivityItem[] = [
  {
    id: '1',
    title: 'Maria',
    subtitle: 'Received',
    amount: '+€250.00',
    amountDirection: 'in',
    date: 'Today, 2:14 PM',
  },
  {
    id: '2',
    title: 'Coffee Shop',
    subtitle: 'Payment',
    amount: '-$4.80',
    amountDirection: 'out',
    date: 'Yesterday',
  },
  {
    id: '3',
    title: 'Deposit',
    subtitle: 'Bank Transfer',
    amount: '+₺10,000',
    amountDirection: 'in',
    date: 'Sep 12',
  },
];
