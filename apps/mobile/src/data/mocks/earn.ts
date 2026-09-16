import type { EarnActivityItem, EarnSummary } from '@/types';

export const earnSummary: EarnSummary = {
  totalBalance: '12,480.32',
  available: '4,220.14',
  earning: '8,260.18',
  earningBalance: '8,260.18',
  strategy: 'Balanced',
  estimatedApy: '6.2%',
  risk: 'Medium',
};

export const earnActivity: EarnActivityItem[] = [
  {
    id: '1',
    title: 'Yield earned',
    amount: '+$3.84',
    amountDirection: 'in',
    date: 'Today',
    time: '8:00 AM',
    group: 'today',
  },
  {
    id: '2',
    title: 'Added to strategy',
    amount: '+$500.00',
    amountDirection: 'in',
    date: 'Today',
    time: '10:22 AM',
    group: 'today',
  },
  {
    id: '3',
    title: 'Withdrawn',
    amount: '-$100.00',
    amountDirection: 'out',
    date: 'Yesterday',
    time: '4:15 PM',
    group: 'yesterday',
  },
];
