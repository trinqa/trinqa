import { Button, HStack, Image, Menu, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  shadow,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { AddMoneySourceSheet } from '@/features/add-money/AddMoneySourceSheet';
import { colors, componentTokens, homeTokens, shortcutShadow, typography } from '@/theme';

interface ShortcutButtonProps {
  label: string;
  symbol: SFSymbol;
  onPress?: () => void;
  isSheetAnchor?: boolean;
}

function ShortcutButton({ label, symbol, onPress, isSheetAnchor = false }: ShortcutButtonProps) {
  const cardModifiers = [
    frame({ width: homeTokens.shortcuts.width, height: homeTokens.shortcuts.height }),
    background(colors.surface),
    clipShape('roundedRectangle', componentTokens.surface.controlRadius),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'roundedRectangle' as const,
      cornerRadius: componentTokens.surface.controlRadius,
    }),
    shadow({
      radius: shortcutShadow.radius,
      y: shortcutShadow.y,
      color: shortcutShadow.color,
    }),
  ];

  const content = (
    <VStack
      alignment="center"
      spacing={8}
      modifiers={
        isSheetAnchor
          ? cardModifiers
          : [frame({ width: homeTokens.shortcuts.width, height: homeTokens.shortcuts.height })]
      }
    >
      <Image systemName={symbol} size={homeTokens.shortcuts.iconSize} color={colors.textPrimary} />
      <Text
        modifiers={[
          font({ size: typography.footnote, weight: 'medium' }),
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
        ...cardModifiers,
      ]}
    >
      {content}
    </Button>
  );
}

export function ShortcutRow({
  onPay,
  onWithdraw,
  onReceive,
  onAccountDetails,
  onSettings,
}: {
  onPay: () => void;
  onWithdraw: () => void;
  onReceive: () => void;
  onAccountDetails: () => void;
  onSettings: () => void;
}) {
  return (
    <HStack
      spacing={homeTokens.shortcuts.gap}
      modifiers={[frame({ maxWidth: Infinity, minHeight: homeTokens.shortcuts.height })]}
    >
      <AddMoneySourceSheet
        anchor={<ShortcutButton label="Add Money" symbol="plus.circle" isSheetAnchor />}
      />
      <ShortcutButton label="Pay" symbol="arrow.up.circle" onPress={onPay} />
      <Menu
        label={<ShortcutButton label="More" symbol="ellipsis.circle" isSheetAnchor />}
        modifiers={[buttonStyle('plain'), accessibilityLabel('More')]}
      >
        <Button label="Withdraw" systemImage="arrow.down.to.line" onPress={onWithdraw} />
        <Button label="Receive" systemImage="arrow.down.circle" onPress={onReceive} />
        <Button label="Account Details" systemImage="doc.text" onPress={onAccountDetails} />
        <Button label="Settings" systemImage="gearshape" onPress={onSettings} />
      </Menu>
    </HStack>
  );
}
