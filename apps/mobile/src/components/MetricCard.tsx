import { Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  padding,
  shadow,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme';

interface MetricCardProps {
  label: string;
  value: string;
  width: number;
}

export function MetricCard({ label, value, width }: MetricCardProps) {
  return (
    <VStack
      alignment="center"
      spacing={4}
      modifiers={[
        padding({ vertical: 10, horizontal: 8 }),
        frame({ width, height: 60 }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: 12 })),
        border({ content: colors.border, width: 1 }),
        shadow({ radius: 6, y: 1, color: '#0000000A' }),
        layoutPriority(1),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 11, weight: 'regular' }),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {value}
      </Text>
    </VStack>
  );
}
