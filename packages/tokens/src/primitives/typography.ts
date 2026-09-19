/** System font. No custom font files are loaded by the current app. */
export const primitiveType = {
  family: 'system-ui',
  sizes: {
    10: 10,
    11: 11,
    12: 12,
    13: 13,
    14: 14,
    15: 15,
    16: 16,
    17: 17,
    18: 18,
    21: 21,
    22: 22,
    25: 25,
    25.5: 25.5,
    28: 28,
    30: 30,
    32: 32,
    34: 34,
    38: 38,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  tracking: {
    walletId: 0.3,
    walletBalance: -0.5,
  },
} as const;
