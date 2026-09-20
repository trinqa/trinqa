import { colors } from '@trinqa/tokens';

/**
 * Welcome borrows the landing page's dark chrome. It is the only dark screen in the app,
 * so its palette lives beside the screen rather than in the shared light-theme tokens.
 *
 * `action` is the one value that is *not* local: the call to action has to be the same
 * blue as every other primary action in the product, so it reads from the token package.
 */
export const welcomePalette = {
  background: '#0A0A0A',
  surface: '#141414',
  title: '#FFFFFF',
  body: '#A1A1A1',
  kicker: '#737373',
  ghostBorder: 'rgba(255,255,255,0.22)',
  dotIdle: 'rgba(255,255,255,0.22)',
  action: colors.action,
  blue: '#3860FF',
  green: '#00D691',
} as const;
