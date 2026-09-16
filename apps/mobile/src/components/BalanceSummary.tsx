import { StyleSheet, View } from 'react-native';
import { Host, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { cardShadow, colors, radius, typography } from '@/theme';

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
    <View style={[styles.container, cardShadow]}>
      <Host matchContents>
        <VStack
          spacing={18}
          alignment="leading"
          modifiers={[
            background(colors.surface),
            cornerRadius(radius.xl),
            padding({ all: spacingValues.cardPadding }),
          ]}
        >
          <VStack spacing={8} alignment="leading">
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
                font({ size: typography.balanceHero, weight: 'bold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              ${totalValue}
            </Text>
          </VStack>

          <HStack spacing={12}>
            <SubMetric label={leftLabel} value={leftValue} />
            <SubMetric label={rightLabel} value={rightValue} />
          </HStack>
        </VStack>
      </Host>
    </View>
  );
}

function SubMetric({ label, value }: { label: string; value: string }) {
  return (
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
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: typography.body, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        ${value}
      </Text>
    </VStack>
  );
}

const spacingValues = {
  cardPadding: 18,
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
  },
});
