import { Host, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
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
    <Host matchContents>
      <HStack
        spacing={12}
        modifiers={[padding({ vertical: 10 })]}
        alignment="center"
      >
        <Text
          modifiers={[
            frame({ width: 40, height: 40 }),
            background(colors.surfaceSecondary),
            cornerRadius(radius.md),
            font({ size: typography.body, weight: 'semibold' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {initial}
        </Text>
        <VStack spacing={2} alignment="leading">
          <Text
            modifiers={[
              font({ size: typography.body, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {title}
          </Text>
          <Text
            modifiers={[
              font({ size: typography.caption }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {subtitle}
          </Text>
        </VStack>
        <Spacer />
        <VStack spacing={2} alignment="trailing">
          <Text
            modifiers={[
              font({ size: typography.body, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {amount}
          </Text>
          {meta ? (
            <Text
              modifiers={[
                font({ size: typography.micro }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {meta}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </Host>
  );
}
