import { Button, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  shadow,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useWindowDimensions } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { AddMoneySourceSheet } from '@/features/add-money/AddMoneySourceSheet';
import { colors, componentTokens, homeTokens, shortcutShadow, spacing, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

interface ShortcutButtonProps {
  label: string;
  symbol: SFSymbol;
  width: number;
  onPress?: () => void;
  /** The sheet renders its own trigger, so this one only draws. */
  isSheetAnchor?: boolean;
}

function shortcutChrome(width: number) {
  const radius = componentTokens.surface.controlRadius;
  return [
    frame({ width, height: homeTokens.shortcuts.height }),
    background(colors.surface),
    clipShape('roundedRectangle', radius),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'roundedRectangle' as const,
      cornerRadius: radius,
    }),
    shadow({
      radius: shortcutShadow.radius,
      y: shortcutShadow.y,
      color: shortcutShadow.color,
    }),
  ];
}

function ShortcutButton({ label, symbol, width, onPress, isSheetAnchor = false }: ShortcutButtonProps) {
  const content = (
    <VStack
      alignment="center"
      spacing={homeTokens.shortcuts.iconToLabel}
      modifiers={
        isSheetAnchor
          ? shortcutChrome(width)
          : [frame({ width, height: homeTokens.shortcuts.height })]
      }
    >
      <Image systemName={symbol} size={homeTokens.shortcuts.iconSize} color={colors.textPrimary} />
      <Text
        modifiers={[
          font({ size: typography.fine, weight: 'medium' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {label}
      </Text>
    </VStack>
  );

  if (isSheetAnchor) return content;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label,
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.controlRadius,
          press: 'full',
        }),
        ...shortcutChrome(width),
      ]}
    >
      {content}
    </Button>
  );
}

/**
 * Every way money moves, side by side. This used to be three wide buttons with
 * Withdraw and Receive tucked into a `More` menu, while Invest and Withdraw also
 * had a second copy inside the balance card. Narrower buttons fit all five, so
 * nothing is hidden and nothing is offered twice.
 */
export function ShortcutRow({
  onInvest,
  onPay,
  onWithdraw,
  onReceive,
}: {
  onInvest: () => void;
  onPay: () => void;
  onWithdraw: () => void;
  onReceive: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const shortcuts = homeTokens.shortcuts;
  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  const width = Math.floor(
    (contentWidth - shortcuts.gap * (shortcuts.count - 1)) / shortcuts.count,
  );

  return (
    <HStack
      spacing={shortcuts.gap}
      modifiers={[frame({ maxWidth: Infinity, minHeight: shortcuts.height })]}
    >
      <AddMoneySourceSheet
        anchor={
          <ShortcutButton label="Deposit" symbol="plus.circle" width={width} isSheetAnchor />
        }
      />
      <ShortcutButton label="Invest" symbol="arrow.up.right.circle" width={width} onPress={onInvest} />
      <ShortcutButton label="Pay" symbol="arrow.up.circle" width={width} onPress={onPay} />
      <ShortcutButton label="Withdraw" symbol="arrow.down.to.line" width={width} onPress={onWithdraw} />
      <ShortcutButton label="Receive" symbol="arrow.down.circle" width={width} onPress={onReceive} />
    </HStack>
  );
}
