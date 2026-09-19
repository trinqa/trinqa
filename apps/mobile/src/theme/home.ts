const walletFrontPadding = 5;
const walletFrontRadius = 18;
const walletStitchInset = 10;
const walletOuterRadius = walletFrontRadius + walletFrontPadding;
const walletStitchRadius = walletFrontRadius - walletStitchInset;

/** Home-screen geometry shared by the reference-matched components. */
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
  },
  shortcuts: {
    width: 115,
    height: 64,
    gap: 4,
    iconSize: 17,
  },
  recent: {
    width: 390,
    topPadding: 19,
    bottomPadding: 16,
    horizontalPadding: 16,
    titleRowsGap: 18,
  },
} as const;
