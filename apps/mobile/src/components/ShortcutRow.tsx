import { Host, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';

const shortcuts = [
  { id: 'add-money', label: 'Add Money', icon: '＋' },
  { id: 'pay', label: 'Pay', icon: '↗' },
  { id: 'more', label: 'More', icon: '···' },
] as const;

export function ShortcutRow() {
  return (
    <Host matchContents>
      <HStack
        spacing={0}
        alignment="center"
        modifiers={[
          background(colors.surface),
          cornerRadius(radius.xl),
          padding({ vertical: 16 }),
          frame({ maxWidth: Infinity }),
        ]}
      >
        {shortcuts.map((item) => (
          <VStack
            key={item.id}
            spacing={8}
            alignment="center"
            modifiers={[frame({ maxWidth: Infinity })]}
          >
            <Text
              modifiers={[
                frame({ width: 44, height: 44 }),
                background(colors.surfaceSecondary),
                cornerRadius(radius.pill),
                font({ size: 18, weight: 'medium' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {item.icon}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.caption, weight: 'medium' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {item.label}
            </Text>
          </VStack>
        ))}
      </HStack>
    </Host>
  );
}
