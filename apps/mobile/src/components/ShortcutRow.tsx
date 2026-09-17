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

import { colors, componentTokens, homeTokens } from '@/theme';

const shortcuts: Array<{ id: string; label: string; symbol: SFSymbol }> = [
  { id: 'add-money', label: 'Add Money', symbol: 'plus.circle' },
  { id: 'pay', label: 'Pay', symbol: 'arrow.up.circle' },
  { id: 'more', label: 'More', symbol: 'ellipsis.circle' },
];

export function ShortcutRow() {
  return (
    <HStack
      spacing={homeTokens.shortcuts.gap}
      modifiers={[frame({ maxWidth: Infinity, minHeight: homeTokens.shortcuts.height })]}
    >
      {shortcuts.map((item) => (
        <Button
          key={item.id}
          onPress={() => undefined}
          modifiers={[
            buttonStyle('plain'),
            frame({ width: homeTokens.shortcuts.width, height: homeTokens.shortcuts.height }),
            background(colors.surface),
            clipShape('roundedRectangle', componentTokens.surface.controlRadius),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'roundedRectangle',
              cornerRadius: componentTokens.surface.controlRadius,
            }),
            shadow({ radius: 4, y: 1, color: '#00000008' }),
          ]}
        >
          <VStack
            alignment="center"
            spacing={8}
            modifiers={[
              frame({ width: homeTokens.shortcuts.width, height: homeTokens.shortcuts.height }),
            ]}
          >
            <Image systemName={item.symbol} size={homeTokens.shortcuts.iconSize} color={colors.textPrimary} />
            <Text
              modifiers={[
                font({ size: 12, weight: 'medium' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {item.label}
            </Text>
          </VStack>
        </Button>
      ))}
    </HStack>
  );
}
