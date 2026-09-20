import { Dimensions } from 'react-native';
import {
  chartTokens as baseChartTokens,
  homeTokens as baseHomeTokens,
  screenTokens as baseScreenTokens,
} from '@trinqa/tokens';

export {
  borders,
  colors,
  componentTokens,
  deepColors,
  motion,
  radius,
  spacing,
  typeRole,
  typeWeight,
  typeWeightRn,
  typography,
  walletColors,
  walletShadow,
} from '@trinqa/tokens';

/**
 * Screens are drawn on a 402pt-wide iPhone, and their layout widths are fixed numbers.
 * The app is portrait-only, so the window width never changes: shift every layout width
 * by the device's difference from that canvas once, at load. A 402pt phone gets the
 * design values unchanged; a Pro Max widens, a mini narrows, and the gutters stay put.
 */
const DESIGN_WIDTH = 402;
const widthDelta = Math.round(Dimensions.get('window').width - DESIGN_WIDTH);

const SCREEN_WIDTH_KEYS = new Set(['contentWidth', 'lowerPanelWidth', 'gaugeWidth']);

function shiftWidths<T extends Record<string, number | string>>(group: T): T {
  const shifted: Record<string, number | string> = { ...group };
  for (const [key, value] of Object.entries(group)) {
    if (SCREEN_WIDTH_KEYS.has(key) && typeof value === 'number') shifted[key] = value + widthDelta;
  }
  return shifted as T;
}

type ScreenTokens = typeof baseScreenTokens;

export const screenTokens = Object.fromEntries(
  Object.entries(baseScreenTokens).map(([name, group]) => [name, shiftWidths(group)]),
) as unknown as ScreenTokens;

export const homeTokens = {
  ...baseHomeTokens,
  recent: { ...baseHomeTokens.recent, width: baseHomeTokens.recent.width + widthDelta },
} as unknown as typeof baseHomeTokens;

export const chartTokens = {
  ...baseChartTokens,
  width: baseChartTokens.width + widthDelta,
} as unknown as typeof baseChartTokens;
