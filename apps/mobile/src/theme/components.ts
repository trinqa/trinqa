const cardRadius = 14;
const insetLayerPadding = 4;

export const componentTokens = {
  surface: {
    panelRadius: 16,
    cardRadius,
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
  dateSectionDivider: {
    labelToLineGap: 8,
    labelWidths: {
      today: 35,
      yesterday: 58,
      dated: 78,
    },
    lineHeight: 1,
    lineOpacity: 0.7,
    toRowsGap: 8,
  },
  layer: {
    inset: insetLayerPadding,
    gap: 4,
    innerRadius: cardRadius,
    outerRadius: cardRadius + insetLayerPadding,
    seamShadowRadius: 2,
    seamShadowY: 1.5,
    seamShadowColor: '#00000009',
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
    brandAccentSize: 10,
    brandAccentOffsetY: 10,
  },
  metricCard: {
    height: 60,
    radius: 12,
    verticalPadding: 10,
    horizontalPadding: 8,
    textGap: 4,
  },
} as const;
