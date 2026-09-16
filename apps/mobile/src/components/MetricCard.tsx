import { Host, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';

interface MetricCardProps {
  label: string;
  value: string;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Host style={{ flex: 1 }}>
      <VStack
        spacing={6}
        alignment="leading"
        modifiers={[
          background(colors.surface),
          cornerRadius(radius.lg),
          padding({ all: 14 }),
          frame({ maxWidth: Infinity }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.caption }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {label}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {value}
        </Text>
      </VStack>
    </Host>
  );
}
