import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme';

const ROW_WIDTH = 364;

interface ActivityTransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  iconLetter?: string;
}

/** Activity-only compact card row (do not use shared TransactionRow). */
export function ActivityTransactionRow({
  title,
  subtitle,
  amount,
  iconLetter,
}: ActivityTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();

  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[
        padding({ horizontal: 14, vertical: 12 }),
        frame({ width: ROW_WIDTH, height: 67, alignment: 'leading' }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: 14 })),
        border({ content: colors.border, width: 1 }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 14, weight: 'semibold' }),
          foregroundStyle(colors.textSecondary),
          frame({ width: 40, height: 40 }),
          background(
            colors.surfaceSecondary,
            shapes.roundedRectangle({ cornerRadius: 12 }),
          ),
        ]}
      >
        {initial}
      </Text>

      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Text
          modifiers={[
            font({ size: 14, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {title}
        </Text>
        <Text
          modifiers={[
            font({ size: 12, weight: 'regular' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {subtitle}
        </Text>
      </VStack>

      <Text
        modifiers={[
          font({ size: 14, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
          layoutPriority(1),
          frame({ alignment: 'trailing' }),
        ]}
      >
        {amount}
      </Text>
    </HStack>
  );
}
