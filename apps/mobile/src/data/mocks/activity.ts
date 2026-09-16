import type {
  ActivityListItem,
  ActivityMetric,
  ChartPoint,
} from '@/types';

export const activityHeadline = {
  label: 'Total Flow',
  value: '$12,480.32',
};

export const activityMetrics: ActivityMetric[] = [
  { id: 'sent', label: 'Sent', value: '$1,240.00' },
  { id: 'earned', label: 'Earned', value: '$186.42' },
  { id: 'received', label: 'Received', value: '$2,850.00' },
];

export const activityChartPoints: ChartPoint[] = [
  { label: 'Sep 1', value: 8200 },
  { label: 'Sep 5', value: 9100 },
  { label: 'Sep 9', value: 8800 },
  { label: 'Sep 13', value: 10200 },
  { label: 'Sep 16', value: 12480 },
];

export const activityPayments: ActivityListItem[] = [
  {
    id: '1',
    title: 'Spotify',
    subtitle: 'Payment',
    amount: '-$12.99',
  },
  {
    id: '2',
    title: 'Coffee Shop',
    subtitle: 'Payment',
    amount: '-$4.80',
  },
  {
    id: '3',
    title: 'Maria',
    subtitle: 'Sent',
    amount: '-€120.00',
  },
];

export const activityEarnings: ActivityListItem[] = [
  {
    id: '1',
    title: 'Yield earned',
    subtitle: 'Daily accrual',
    amount: '+$3.84',
  },
  {
    id: '2',
    title: 'Added to strategy',
    subtitle: 'Balanced',
    amount: '+$500.00',
  },
  {
    id: '3',
    title: 'Withdrawn',
    subtitle: 'To available',
    amount: '-$100.00',
  },
];
