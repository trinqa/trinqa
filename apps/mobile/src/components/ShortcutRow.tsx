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
import type { SFSymbol } from 'sf-symbols-typescript';

import { AddMoneySourceSheet } from '@/features/add-money/AddMoneySourceSheet';
import { colors, componentTokens, homeTokens } from '@/theme';

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
    shadow({ radius: 4, y: 1, color: componentTokens.surface.shadowColor }),
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
          font({ size: 12, weight: 'medium' }),
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

export function ShortcutRow({ onPay }: { onPay: () => void }) {
  return (
    <HStack
      spacing={homeTokens.shortcuts.gap}
      modifiers={[frame({ maxWidth: Infinity, minHeight: homeTokens.shortcuts.height })]}
    >
      <AddMoneySourceSheet
        anchor={<ShortcutButton label="Add Money" symbol="plus.circle" isSheetAnchor />}
      />
      <ShortcutButton label="Pay" symbol="arrow.up.circle" onPress={onPay} />
      <ShortcutButton label="More" symbol="ellipsis.circle" onPress={() => undefined} />
    </HStack>
  );
}
