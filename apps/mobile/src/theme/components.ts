export const componentTokens = {
  surface: {
    panelRadius: 16,
    cardRadius: 14,
    controlRadius: 11,
    borderWidth: 0.5,
    shadowRadius: 8,
    shadowY: 2,
    shadowColor: '#0000000A',
  },
  headerControl: {
    size: 44,
    symbolSize: 17,
    gap: 8,
  },
  layer: {
    inset: 4,
    gap: 4,
  },
  transactionRow: {
    mainHeight: 67,
    footerHeight: 32,
    horizontalPadding: 13,
    verticalPadding: 8,
    iconSize: 36,
    symbolSize: 15,
    contentGap: 10,
    textGap: 2,
    rowGap: 10,
  },
  metricCard: {
    height: 60,
    radius: 12,
    verticalPadding: 10,
    horizontalPadding: 8,
    textGap: 4,
  },
} as const;
