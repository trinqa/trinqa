import { Button, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  shadow,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors } from '@/theme';

const shortcuts: Array<{ id: string; label: string; symbol: SFSymbol }> = [
  { id: 'add-money', label: 'Add Money', symbol: 'plus.circle' },
  { id: 'pay', label: 'Pay', symbol: 'arrow.up.circle' },
  { id: 'more', label: 'More', symbol: 'ellipsis.circle' },
];

const SHORTCUT_WIDTH = 118;
const SHORTCUT_HEIGHT = 66;
const SHORTCUT_GAP = 5;

export function ShortcutRow() {
  return (
    <HStack spacing={SHORTCUT_GAP} modifiers={[frame({ maxWidth: Infinity, minHeight: SHORTCUT_HEIGHT })]}>
      {shortcuts.map((item) => (
        <Button
          key={item.id}
          onPress={() => undefined}
          modifiers={[
            buttonStyle('plain'),
            frame({ width: SHORTCUT_WIDTH, height: SHORTCUT_HEIGHT }),
            background(colors.surface),
            clipShape('roundedRectangle', 12),
            border({ content: colors.border, width: 1 }),
            shadow({ radius: 6, y: 1, color: '#0000000A' }),
          ]}
        >
          <VStack alignment="center" spacing={8} modifiers={[frame({ width: SHORTCUT_WIDTH, height: SHORTCUT_HEIGHT })]}>
            <Image systemName={item.symbol} size={17} color={colors.textPrimary} />
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
