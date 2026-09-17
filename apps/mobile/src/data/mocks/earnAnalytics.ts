import type { ChartPoint, InstallmentItem } from '@/types';

export const earnHeadline = {
  label: 'Total Spending',
  value: '$248,967.83',
} as const;

export const earnMetrics = [
  { id: 'progress', label: 'On Progress', value: '$61,523.00' },
  { id: 'overdue', label: 'Overdue', value: '$4,825.43' },
  { id: 'total', label: 'Total', value: '$89,271.92' },
] as const;

export const earnChartPoints: ChartPoint[] = [
  { label: 'Nov 1, 2025', value: 520 },
  { label: 'Nov 6, 2025', value: 1620 },
  { label: 'Nov 11, 2025', value: 1620 },
  { label: 'Nov 16, 2025', value: 3180 },
  { label: 'Nov 20, 2025', value: 3180 },
  { label: 'Nov 25, 2025', value: 4274 },
  { label: 'Nov 30, 2025', value: 4274 },
];

export const installmentItems: InstallmentItem[] = [
  {
    id: 'ps5',
    title: 'PS5',
    merchant: 'Amazon.com',
    amount: '$836.94',
    dueDate: 'Due date 18',
    installment: '1 of 4 Installment',
    symbol: 'gamecontroller.fill',
    plan: 'four',
  },
  {
    id: 'camera',
    title: 'Nikon Camera',
    merchant: 'Amazon.com',
    amount: '$563.04',
    dueDate: 'Due date 18',
    installment: '3 of 4 Installment',
    symbol: 'camera.fill',
    plan: 'four',
  },
  {
    id: 'laptop',
    title: 'Gaming Laptop',
    merchant: 'Apple.com',
    amount: '$1,746.94',
    dueDate: 'Due date 18',
    installment: '2 of 4 Installment',
    symbol: 'laptopcomputer',
    plan: 'four',
  },
  {
    id: 'phone',
    title: 'iPhone',
    merchant: 'Apple.com',
    amount: '$1,249.00',
    dueDate: 'Due date 24',
    installment: '2 of 6 Installment',
    symbol: 'iphone.gen3',
    plan: 'six',
  },
];
