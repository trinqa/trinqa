/**
 * Canonical design language extracted from Home, Wallet, Earn, Activity.
 * CTA color is preserved separately and is not part of this normalization.
 */

export const typeRole = {
  pageTitle: { size: 30, weight: 'bold' as const },
  amountHero: { size: 32, weight: 'bold' as const },
  amountDisplay: { size: 25, weight: 'bold' as const },
  amountCurrency: { size: 22, weight: 'bold' as const },
  sectionTitle: { size: 17, weight: 'semibold' as const },
  kicker: { size: 16, weight: 'medium' as const },
  label: { size: 15, weight: 'semibold' as const },
  body: { size: 14, weight: 'regular' as const },
  caption: { size: 13, weight: 'regular' as const },
  footnote: { size: 12, weight: 'medium' as const },
  fine: { size: 11, weight: 'regular' as const },
  micro: { size: 10, weight: 'regular' as const },
} as const;

export const typeWeight = {
  regular: 'regular' as const,
  medium: 'medium' as const,
  semibold: 'semibold' as const,
  bold: 'bold' as const,
};

/** React Native StyleSheet mapping for the same four weights. */
export const typeWeightRn = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Size lookup used by existing `font({ size: typography.* })` calls. */
export const typography = {
  pageTitle: typeRole.pageTitle.size,
  amountHero: typeRole.amountHero.size,
  amountDisplay: typeRole.amountDisplay.size,
  amountCurrency: typeRole.amountCurrency.size,
  sectionTitle: typeRole.sectionTitle.size,
  kicker: typeRole.kicker.size,
  label: typeRole.label.size,
  body: typeRole.body.size,
  caption: typeRole.caption.size,
  footnote: typeRole.footnote.size,
  fine: typeRole.fine.size,
  micro: typeRole.micro.size,
  activityTitle: typeRole.pageTitle.size,
  balanceLarge: typeRole.amountHero.size,
  balanceHero: typeRole.amountHero.size,
  balanceMedium: typeRole.amountCurrency.size,
  screenTitle: typeRole.pageTitle.size,
  transactionTitle: typeRole.label.size,
  transactionMeta: typeRole.caption.size,
  transactionAction: typeRole.footnote.size,
} as const;

export const space = {
  4: 4,
  6: 6,
  7: 7,
  8: 8,
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  18: 18,
  19: 19,
  20: 20,
  21: 21,
  22: 22,
  25: 25,
  28: 28,
  32: 32,
} as const;

export const spacing = {
  screen: 18,
  section: 16,
  row: 8,
  control: 12,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 24,
  flowBlock: 28,
  screenHorizontal: 18,
  cardGap: 12,
  sectionGap: 20,
  cardPadding: 18,
  headerTop: 8,
  scrollBottom: 32,
} as const;

export const radius = {
  control: 11,
  card: 14,
  panel: 16,
  sheet: 20,
  pill: 999,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  walletFront: 18,
  walletOuter: 23,
} as const;

export const borders = {
  hairline: 0.5,
  standard: 1,
} as const;

export const motion = {
  press: { duration: 80, scale: 0.98, opacity: 0.92 },
  selection: { duration: 120 },
  contentChange: { duration: 160, translateY: 2 },
  processing: { duration: 1400 },
  duration: {
    onboardingReady: 850,
    flowProcessing: 1400,
    press: 80,
    selection: 120,
    contentChange: 160,
  },
  navigation: {
    onboarding: 'fade' as const,
    flowPush: 'slide_from_right' as const,
  },
  opacity: {
    disabled: 0.45,
    press: 0.92,
  },
} as const;
