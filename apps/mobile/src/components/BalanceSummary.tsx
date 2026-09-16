import { useState } from 'react';

import { Button, HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, typography } from '@/theme';

const REPORT_WIDTH = 366;
const CARD_WIDTH = 396;
const CARD_HEIGHT = 206;
const CARD_RADIUS = 15;
const METRIC_GAP = 8;

interface BalanceSummaryProps {
  totalLabel: string;
  totalValue: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}

function MetricTile({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: number;
}) {
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[
        padding({ horizontal: 14, vertical: 12 }),
        frame({ width, height: 64 }),
        background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: 12 })),
      ]}
    >
      <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.textSecondary)]}>{label}</Text>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
        ${value}
      </Text>
    </VStack>
  );
}

export function BalanceSummary({
  totalLabel,
  totalValue,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: BalanceSummaryProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const displayValue = balanceVisible ? totalValue : '••••••';

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        padding({ top: 24, horizontal: 16, bottom: 26 }),
        frame({ width: CARD_WIDTH, height: CARD_HEIGHT }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: CARD_RADIUS })),
        border({ content: colors.border, width: 1 }),
        shadow({ radius: 8, y: 2, color: '#0000000A' }),
        frame({ width: REPORT_WIDTH }),
      ]}
    >
      <Text modifiers={[font({ size: 13 }), foregroundStyle(colors.textSecondary)]}>{totalLabel}</Text>

      <HStack
        alignment="center"
        spacing={8}
        modifiers={[padding({ top: 7 }), frame({ maxWidth: Infinity, minHeight: 44 })]}
      >
        <HStack alignment="firstTextBaseline" spacing={0} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(colors.textSecondary)]}>$</Text>
          <Text
            modifiers={[
              font({ size: typography.balanceLarge, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {displayValue}
          </Text>
        </HStack>

        <Button
          onPress={() => setBalanceVisible((visible) => !visible)}
          modifiers={[
            buttonStyle('plain'),
            padding({ all: 0 }),
            frame({ width: 44, height: 44 }),
            background(colors.surfaceSecondary, shapes.circle()),
          ]}
        >
          <Image
            systemName={balanceVisible ? 'eye' : 'eye.slash'}
            size={17}
            color={colors.textPrimary}
          />
        </Button>
      </HStack>

      <HStack spacing={METRIC_GAP} modifiers={[padding({ top: 28, leading: 1 }), frame({ width: 360, alignment: 'leading' })]}>
        <MetricTile label={leftLabel} value={leftValue} width={177} />
        <MetricTile label={rightLabel} value={rightValue} width={175} />
      </HStack>
    </VStack>
  );
}
