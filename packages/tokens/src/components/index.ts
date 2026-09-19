import { primitiveColor } from '../primitives/color';
import { colors, componentTokens, homeTokens, radius, screenTokens } from '../product';

export const button = {
  primary: {
    height: componentTokens.actionButton.height,
    radius: componentTokens.actionButton.radius,
    highlightOpacity: componentTokens.actionButton.highlightOpacity,
    disabledOpacity: componentTokens.actionButton.disabledOpacity,
    colors: [colors.action, colors.actionPrimaryDark, colors.actionPrimaryDarker],
  },
} as const;

export const card = {
  radius: radius.xl,
  panelRadius: componentTokens.surface.panelRadius,
  borderWidth: componentTokens.surface.borderWidth,
  border: colors.borderStrong,
  background: colors.surface,
} as const;

export const transaction = {
  height: componentTokens.transactionRow.mainHeight,
  walletHeight: screenTokens.wallet.transactionRowHeight,
  paddingX: componentTokens.transactionRow.horizontalPadding,
} as const;

export const sheet = {
  addMoneyHeight: screenTokens.addMoney.sheetHeight,
  withdrawHeight: screenTokens.withdrawalFlow.sheetHeight,
  fitToContents: true,
  dragIndicator: 'visible',
} as const;

export const walletCard = {
  backgroundStart: primitiveColor.gray2B,
  width: homeTokens.layout.walletBaseWidth,
  height: homeTokens.layout.walletBaseHeight,
  outerRadius: homeTokens.wallet.outerRadius,
} as const;
