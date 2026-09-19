import { primitiveColor } from '../primitives/color';

/**
 * Semantic roles mapped from actual usage. Unmapped one-offs stay in wallet / inventory.
 */
export const semanticColor = {
  surface: {
    canvas: primitiveColor.grayF3,
    primary: primitiveColor.white,
    secondary: primitiveColor.grayF5,
    layer: primitiveColor.grayF2,
    inverse: primitiveColor.gray2B,
    splash: primitiveColor.grayF4F2,
  },
  text: {
    primary: primitiveColor.gray111,
    secondary: primitiveColor.gray787,
    inverse: primitiveColor.walletTextF6,
    walletPrimary: primitiveColor.walletTextF6,
    walletSecondary: primitiveColor.walletTextF2,
    walletTertiary: primitiveColor.walletTextD4,
  },
  border: {
    subtle: primitiveColor.grayE5,
    strong: primitiveColor.grayE5,
  },
  action: {
    primary: primitiveColor.cyan08AFD3,
    primaryDark: primitiveColor.cyan08A7CA,
    primaryDarker: primitiveColor.cyan079FC0,
    highlight: primitiveColor.cyan08AFD3,
  },
  accent: {
    unusedBlue: primitiveColor.blue2F6BFF,
    muted: primitiveColor.blueD9E8FF,
    chartFill: primitiveColor.cyan08AFD31F,
  },
  status: {
    success: primitiveColor.green20AD2B,
    successMuted: primitiveColor.greenEDF8E8,
    danger: primitiveColor.redFF3B30,
    pending: primitiveColor.gray787,
  },
  brand: {
    merchantLogo: primitiveColor.gray111,
    merchantLogoAccent: primitiveColor.orangeFF9900,
  },
} as const;
