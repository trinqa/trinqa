import { HStack, Text, VStack } from '@expo/ui/swift-ui';
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

const ROW_HEIGHT = 67;

interface HomeTransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  meta?: string;
  iconLetter?: string;
}

export function HomeTransactionRow({
  title,
  subtitle,
  amount,
  meta,
  iconLetter,
}: HomeTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();

  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[
        padding({ horizontal: 14, vertical: 9 }),
        frame({ maxWidth: Infinity, height: ROW_HEIGHT }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: 13 })),
        border({ content: colors.border, width: 1 }),
        shadow({ radius: 4, y: 1, color: '#00000008' }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 14, weight: 'semibold' }),
          foregroundStyle(colors.textSecondary),
          frame({ width: 40, height: 40 }),
          background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: 12 })),
        ]}
      >
        {initial}
      </Text>

      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.textSecondary)]}>{subtitle}</Text>
      </VStack>

      <VStack alignment="trailing" spacing={2} modifiers={[layoutPriority(1), frame({ alignment: 'trailing' })]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {amount}
        </Text>
        {meta ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.textSecondary)]}>{meta}</Text>
        ) : null}
      </VStack>
    </HStack>
  );
}
