import { Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  padding,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, typography } from '@/theme';

interface MetricCardProps {
  label: string;
  labelFontSize?: number;
  value: string;
  width: number;
}

export function MetricCard({ label, labelFontSize, value, width }: MetricCardProps) {
  const metric = componentTokens.metricCard;
  const surface = componentTokens.surface;

  return (
    <VStack
      alignment="center"
      spacing={metric.textGap}
      modifiers={[
        padding({ vertical: metric.verticalPadding, horizontal: metric.horizontalPadding }),
        frame({ width, height: metric.height }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: metric.radius })),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: metric.radius,
        }),
        shadow({ radius: surface.shadowRadius * 0.75, y: 1, color: surface.shadowColor }),
        layoutPriority(1),
      ]}
    >
      <Text
        modifiers={[
          font({ size: labelFontSize ?? typography.transactionMeta, weight: 'regular' }),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: typography.transactionTitle, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {value}
      </Text>
    </VStack>
  );
}
