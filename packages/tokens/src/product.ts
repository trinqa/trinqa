import { primitiveColor } from './primitives/color';
import { primitiveOpacity } from './primitives/opacity';
import { primitiveShadow } from './primitives/shadow';
import { radius as canonicalRadius } from './canonical';

export {
  borders,
  motion,
  radius,
  space,
  spacing,
  typeRole,
  typeWeight,
  typeWeightRn,
  typography,
} from './canonical';

/** Exact `colors` object currently consumed by the mobile app. */
export const colors = {
  background: primitiveColor.grayF3,
  surface: primitiveColor.white,
  surfaceSecondary: primitiveColor.grayF5,
  surfaceLayer: primitiveColor.grayF2,
  textPrimary: primitiveColor.gray111,
  textSecondary: primitiveColor.gray787,
  textInverse: primitiveColor.walletTextF6,
  borderStrong: primitiveColor.grayE5,
  action: primitiveColor.blue007AFF,
  actionPrimaryDark: primitiveColor.blue0074F2,
  actionPrimaryDarker: primitiveColor.blue006EE6,
  selection: primitiveColor.blueD9E8FF,
  success: primitiveColor.green20AD2B,
  successMuted: primitiveColor.greenEDF8E8,
  danger: primitiveColor.redFF3B30,
  pending: primitiveColor.gray787,
  merchantLogo: primitiveColor.gray111,
  merchantLogoAccent: primitiveColor.orangeFF9900,
  merchantLogoWarm: primitiveColor.orangeFF6A00,
} as const;


const cardRadius = canonicalRadius.card;
const insetLayerPadding = 4;

export const componentTokens = {
  surface: {
    panelRadius: 16,
    cardRadius,
    controlRadius: 11,
    borderWidth: 0.5,
    shadowRadius: primitiveShadow.surface.radius,
    shadowY: primitiveShadow.surface.offsetY,
    shadowColor: primitiveShadow.surface.color,
    rowLiftRadius: primitiveShadow.rowLift.radius,
    rowLiftY: primitiveShadow.rowLift.offsetY,
    rowLiftColor: primitiveShadow.rowLift.color,
  },
  headerControl: {
    size: 44,
    symbolSize: 17,
    gap: 8,
  },
  /**
   * Apple HIG minimum hit box. When the visible control is smaller, grow the
   * hit area with padding or frame — do not enlarge the glyph or label.
   */
  tapTarget: {
    size: 44,
  },
  dateSectionDivider: {
    labelToLineGap: 8,
    labelWidths: {
      today: 35,
      yesterday: 58,
      dated: 78,
    },
    lineHeight: 1,
    lineOpacity: primitiveOpacity.dividerLine,
    toRowsGap: 8,
  },
  layer: {
    inset: insetLayerPadding,
    gap: 4,
    innerRadius: cardRadius,
    outerRadius: cardRadius + insetLayerPadding,
    seamShadowRadius: primitiveShadow.seam.radius,
    seamShadowY: primitiveShadow.seam.offsetY,
    seamShadowColor: primitiveShadow.seam.color,
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
  actionButton: {
    height: 48,
    radius: 14,
    highlightOpacity: primitiveOpacity.actionHighlight,
    disabledOpacity: primitiveOpacity.disabled,
  },
  selectionRow: {
    height: 64,
    radius: 14,
    iconSize: 36,
    symbolSize: 15,
    contentGap: 12,
    horizontalPadding: 13,
  },
} as const;

const walletFrontPadding = 5;
const walletFrontRadius = 18;
const walletStitchInset = 10;
const walletOuterRadius = walletFrontRadius + walletFrontPadding;
const walletStitchRadius = walletFrontRadius - walletStitchInset;

export const homeTokens = {
  layout: {
    walletBaseWidth: 380,
    walletBaseHeight: 262,
    headerWalletGap: 16,
    walletShortcutGap: 25,
    shortcutRecentGap: 20,
  },
  wallet: {
    frontInset: walletFrontPadding,
    frontBottomInset: walletFrontPadding,
    frontRadius: walletFrontRadius,
    outerRadius: walletOuterRadius,
    stitchInset: walletStitchInset,
    stitchCurveInset: 9,
    stitchRadius: walletStitchRadius,
    stitchWidth: 1.15,
    stitchDash: 2.4,
    stitchGap: 4.1,
    balanceTypeSize: 22,
    idTracking: 0.3,
    balanceTracking: -0.5,
    labelToBalance: 5,
    currencyGap: 4,
  },
  /** Five actions across the content width, so nothing hides behind a menu. */
  shortcuts: {
    count: 5,
    height: 58,
    gap: 6,
    iconSize: 16,
    iconToLabel: 6,
  },
  recent: {
    width: 390,
    topPadding: 19,
    bottomPadding: 16,
    horizontalPadding: 16,
    titleRowsGap: 18,
  },
} as const;

export const screenTokens = {
  wallet: {
    contentWidth: 366,
    headerToBalance: 15,
    /** 22 top + label + 7 + amount + 12 + 114 layer + 18 bottom. */
    balanceHeight: 216,
    balancePaddingTop: 22,
    balancePaddingHorizontal: 16,
    balanceTitleToValue: 7,
    balanceValueToMetrics: 12,
    /** Inset (4) + tile row (58) + gap (4) + action row (44) + inset (4). */
    metricLayerHeight: 114,
    metricTileHeight: 58,
    balanceActionHeight: 44,
    detailsTopGap: 14,
    detailsHorizontalPadding: 16,
    detailsTopPadding: 22,
    detailsBottomPadding: 28,
    filterChipHeight: 44,
    filterChipPaddingX: 14,
    titleToLimitCard: 18,
    limitCardHeight: 82,
    transactionTopGap: 14,
    transactionTitleToGroup: 18,
    transactionRowHeight: 56,
    transactionRowGap: 8,
    gaugeWidth: 298,
    gaugeHeight: 28,
    gaugeInset: 6,
    gaugeTrackHeight: 12,
    gaugeThumbOuter: 8,
    gaugeThumbInner: 6,
    transactionIconSize: 42,
    transactionSymbolSize: 18,
  },
  flowChrome: {
    processingTop: 34,
    successTop: 36,
    iconTitleGap: 28,
    titleAmountGap: 24,
    amountGap: 14,
    captionGap: 4,
    noticeGap: 28,
    timelineWidth: 300,
    progressScale: 1.65,
    progressSymbolSize: 19,
    successSymbolSize: 34,
    chipPaddingX: 14,
    chipPaddingY: 12,
  },
  earn: {
    contentWidth: 350,
    contentHorizontalOffset: 8,
    headlineTopGap: 22,
    chartTopGap: 11,
    metricTopGap: 21,
    metricGap: 7,
    lowerPanelTopGap: 18,
    lowerPanelWidth: 374,
    lowerPanelPadding: 16,
    pickerHeight: 44,
    pickerToRowsGap: 18,
  },
  portfolio: {
    /** Overscroll past this many points on Home releases into Portfolio. */
    pullRevealThreshold: 88,
    pullHintHeight: 34,
    sectionGap: 16,
    earningsTrayHeight: 66,
  },
  /**
   * The value card, shared by Home and Portfolio. One hero, one set of numbers,
   * one geometry — the two screens open on the same object.
   */
  valueCard: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 18,
    labelToAmount: 2,
    amountToBar: 16,
    /** Thin track. The shares are printed beside their own figures, not inside it. */
    barHeight: 12,
    barRadius: 6,
    barGap: 3,
    barToColumns: 18,
    columnGap: 16,
    /** Icons sit at the label's own size so they read as part of the word. */
    columnIconToLabel: 5,
    columnLabelToValue: 4,
    columnValueToDelta: 3,
    dividerWidth: 1,
    dividerHeight: 54,
  },
  /** The range switch, above the cards it governs rather than inside one. */
  periodBar: {
    height: 32,
    toContent: 14,
  },
  activity: {
    contentWidth: 366,
    headerToTitle: 13,
    titleSubtitleGap: 4,
    subtitleToSegment: 6,
    segmentHeight: 44,
    segmentToPanel: 12,
    sectionGap: 14,
  },
  addMoney: {
    contentWidth: 366,
    sheetHeight: 448,
    headerToContent: 28,
    methodHeight: 44,
    amountTopGap: 30,
    amountFieldHeight: 62,
    quickAmountGap: 8,
    quickAmountHeight: 40,
    summaryTopGap: 18,
    summaryHeight: 120,
    summaryDividerToMetadata: 4,
    cardPadding: 16,
    cardGap: 12,
    noticeHeight: 72,
    processingIconSize: 88,
    successIconSize: 92,
  },
  putToWork: {
    contentWidth: 366,
    headerToContent: 20,
    availableHeight: 64,
    strategyRowHeight: 62,
    strategyGap: 8,
    horizonTopGap: 18,
    horizonHeight: 44,
    explanationHeight: 48,
    summaryHeight: 120,
    cardPadding: 16,
    cardGap: 12,
  },
  paymentFlow: {
    contentWidth: 366,
    headerToContent: 20,
    recipientRowHeight: 64,
    recipientRowGap: 8,
    methodTopGap: 20,
    methodGap: 8,
    methodHeight: 76,
    currencyTopGap: 8,
    currencyHeight: 36,
    summaryHeight: 140,
    cardPadding: 16,
    cardGap: 12,
  },
  withdrawalFlow: {
    contentWidth: 366,
    summaryHeight: 158,
    destinationTopGap: 28,
    destinationRowGap: 8,
    destinationSectionGap: 20,
    sheetHeight: 340,
    fieldHeight: 48,
  },
} as const;

export const walletColors = {
  bodyStart: primitiveColor.walletBodyStart,
  bodyEnd: primitiveColor.walletBodyEnd,
  bodyStroke: primitiveColor.walletBodyStroke,
  silver0: primitiveColor.walletSilver0,
  silver55: primitiveColor.walletSilver55,
  silver100: primitiveColor.walletSilver100,
  pocket0: primitiveColor.walletPocket0,
  pocket100: primitiveColor.walletPocket100,
  pocketEdge: primitiveColor.walletPocketEdge,
  rivet: primitiveColor.walletRivet,
  rivetCore: primitiveColor.walletRivetCore,
  stitch: primitiveColor.stitchWhite18,
  pocketHighlight: primitiveColor.stitchWhite07,
  gaugeStart: primitiveColor.cyan62C0DF,
  gaugeEnd: primitiveColor.cyan00A8E8,
  textPrimary: primitiveColor.walletTextF6,
  textSecondary: primitiveColor.walletTextF2,
  textTertiary: primitiveColor.walletTextD4,
  textInverse: primitiveColor.walletTextF6,
} as const;

export const walletShadow = primitiveShadow.wallet;

export const chartTokens = {
  areaFill: primitiveColor.blue007AFF1F,
  line: colors.action,
  scaleX: 1.13,
  scaleY: 0.8,
  offsetX: 10.5,
  offsetY: 30,
  width: 350,
  plotHeight: 181,
  gridLine: primitiveColor.black10,
  tooltipShadow: primitiveShadow.chartTooltip.color,
  tooltipRadius: 8,
} as const;

