import type { ChartPoint } from '@/types';

/**
 * Static chart presentation fixture — 3-month window (Jul 1 – Sep 23, 2026).
 * Weekly cadence (~13 points) keeps the rise→plateau shape without a bead-necklace.
 * Balances and "You've earned" hero come from mockAppState transactions; not derived here.
 */
export const earnChartPoints: ChartPoint[] = [
  { label: 'Jul 1, 2026',  value: 0 },
  { label: 'Jul 8, 2026',  value: 21.5 },
  { label: 'Jul 15, 2026', value: 21.5 },
  { label: 'Jul 22, 2026', value: 68.3 },
  { label: 'Jul 29, 2026', value: 68.3 },
  { label: 'Aug 5, 2026',  value: 115.4 },
  { label: 'Aug 12, 2026', value: 115.4 },
  { label: 'Aug 19, 2026', value: 162.8 },
  { label: 'Aug 26, 2026', value: 162.8 },
  { label: 'Sep 2, 2026',  value: 198.6 },
  { label: 'Sep 9, 2026',  value: 198.6 },
  { label: 'Sep 16, 2026', value: 235.4 },
  { label: 'Sep 23, 2026', value: 243.62, displayValue: '+$43.20' },
];
