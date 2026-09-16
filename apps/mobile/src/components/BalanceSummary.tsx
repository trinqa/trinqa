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

interface BalanceSummaryProps {
  totalLabel: string;
  totalValue: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}

export function BalanceSummary({
  totalLabel,
  totalValue,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: BalanceSummaryProps) {
  return (
    <Host matchContents>
      <VStack
        spacing={16}
        alignment="leading"
        modifiers={[
          background(colors.surface),
          cornerRadius(radius.xl),
          padding({ all: 18 }),
        ]}
      >
        <VStack spacing={6} alignment="leading">
          <Text
            modifiers={[
              font({ size: typography.caption }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {totalLabel}
          </Text>
          <Text
            modifiers={[
              font({ size: typography.balanceMedium, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            ${totalValue}
          </Text>
        </VStack>

        <HStack spacing={12}>
          <VStack
            spacing={4}
            alignment="leading"
            modifiers={[
              background(colors.surfaceSecondary),
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
              {leftLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              ${leftValue}
            </Text>
          </VStack>

          <VStack
            spacing={4}
            alignment="leading"
            modifiers={[
              background(colors.surfaceSecondary),
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
              {rightLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              ${rightValue}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Host>
  );
}
