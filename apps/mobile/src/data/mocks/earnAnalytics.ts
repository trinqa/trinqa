import type { ChartPoint } from '@/types';

/** Static chart presentation fixture; balances and events come from mockAppState. */
export const earnChartPoints: ChartPoint[] = [
  { label: 'Sep 1, 2026', value: 0 },
  { label: 'Sep 4, 2026', value: 18.2 },
  { label: 'Sep 7, 2026', value: 18.2 },
  { label: 'Sep 10, 2026', value: 61.45 },
  { label: 'Sep 13, 2026', value: 61.45 },
  { label: 'Sep 16, 2026', value: 102.8 },
  { label: 'Sep 20, 2026', value: 143.62, displayValue: '+$43.20' },
  { label: 'Sep 25, 2026', value: 186.42 },
];
