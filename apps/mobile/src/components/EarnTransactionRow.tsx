import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, typography } from '@/theme';

interface EarnTransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  iconLetter?: string;
}

export function EarnTransactionRow({
  title,
  subtitle,
  amount,
  iconLetter,
}: EarnTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();

  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[frame({ width: 366, height: 56 })]}
    >
      <Text
        modifiers={[
          font({ size: typography.body, weight: 'semibold' }),
          foregroundStyle(colors.textSecondary),
          frame({ width: 40, height: 40 }),
          background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: 12 })),
        ]}
      >
        {initial}
      </Text>

      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.fine }), foregroundStyle(colors.textSecondary)]}>{subtitle}</Text>
      </VStack>

      <Text
        modifiers={[
          layoutPriority(1),
          font({ size: typography.body, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
          frame({ alignment: 'trailing' }),
        ]}
      >
        {amount}
      </Text>
    </HStack>
  );
}
