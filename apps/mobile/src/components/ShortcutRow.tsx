import { StyleSheet, View } from 'react-native';
import { Host, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { cardShadow, colors, radius, typography } from '@/theme';

const shortcuts: Array<{ id: string; label: string; symbol: SFSymbol }> = [
  { id: 'add-money', label: 'Add Money', symbol: 'plus.circle' },
  { id: 'pay', label: 'Pay', symbol: 'arrow.up.circle' },
  { id: 'more', label: 'More', symbol: 'ellipsis.circle' },
];

export function ShortcutRow() {
  return (
    <View style={[styles.container, cardShadow]}>
      <Host matchContents>
        <HStack
          spacing={0}
          alignment="center"
          modifiers={[
            background(colors.surface),
            cornerRadius(radius.xl),
            padding({ vertical: 18, horizontal: 8 }),
            frame({ maxWidth: Infinity }),
          ]}
        >
          {shortcuts.map((item) => (
            <VStack
              key={item.id}
              spacing={10}
              alignment="center"
              modifiers={[frame({ maxWidth: Infinity })]}
            >
              <Image
                systemName={item.symbol}
                size={22}
                color={colors.textPrimary}
                modifiers={[
                  frame({ width: 48, height: 48 }),
                  background(colors.surfaceSecondary),
                  cornerRadius(radius.lg),
                ]}
              />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
  },
});
