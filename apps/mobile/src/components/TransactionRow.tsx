import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';

interface TransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  meta?: string;
  iconLetter?: string;
}

export function TransactionRow({
  title,
  subtitle,
  amount,
  meta,
  iconLetter,
}: TransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();

  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[frame({ maxWidth: Infinity, minHeight: 68 })]}
    >
      <Text
        modifiers={[
          font({ size: typography.body, weight: 'semibold' }),
          foregroundStyle(colors.textSecondary),
          frame({ width: 44, height: 44 }),
          background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: radius.lg })),
        ]}
      >
        {initial}
      </Text>

      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      </VStack>

      <VStack
        alignment="trailing"
        spacing={3}
        modifiers={[layoutPriority(1), frame({ alignment: 'trailing' })]}
      >
        <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {amount}
        </Text>
        {meta ? (
          <Text modifiers={[font({ size: typography.micro }), foregroundStyle(colors.textSecondary)]}>
            {meta}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}
