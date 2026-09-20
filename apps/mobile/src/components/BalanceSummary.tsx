import { useState } from 'react';

import { Button, Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { SurfacePanel } from '@/components/SurfacePanel';
import { InsetLayer } from '@/components/InsetLayer';
import { colors, componentTokens, screenTokens, typography } from '@/theme';

interface BalanceSummaryProps {
  currencySymbol?: string;
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
  currencySymbol,
}: {
  label: string;
  value: string;
  width: number;
  currencySymbol: string;
}) {
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[
        frame({ width, height: 58 }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
      ]}
    >
      <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>{label}</Text>
      <Text modifiers={[font({ size: typography.label, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
        {value} {currencySymbol}
      </Text>
    </VStack>
  );
}

export function BalanceSummary({
  currencySymbol = '$',
  totalLabel,
  totalValue,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: BalanceSummaryProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const displayValue = balanceVisible ? totalValue : '••••••';
  const wallet = screenTokens.wallet;
  // Two tiles filling the panel: 159pt each on the 402pt design canvas, wider on larger phones.
  const tileWidth = Math.floor((wallet.contentWidth - wallet.balancePaddingHorizontal * 2 - 16) / 2);

  return (
    <SurfacePanel
      width={wallet.contentWidth}
      height={wallet.balanceHeight}
      cornerRadius={componentTokens.surface.panelRadius}
    >
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          padding({
            top: wallet.balancePaddingTop,
            horizontal: wallet.balancePaddingHorizontal,
          }),
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        ]}
      >
        <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
          {totalLabel}
        </Text>

        <HStack
          alignment="center"
          spacing={8}
          modifiers={[
            padding({ top: wallet.balanceTitleToValue }),
            frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size }),
          ]}
        >
          <HStack
            alignment="firstTextBaseline"
            spacing={4}
            modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
          >
            <Text
              modifiers={[
                font({ size: typography.amountCurrency, weight: 'bold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {displayValue}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.label, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {currencySymbol}
            </Text>
          </HStack>

          <Button
            label={balanceVisible ? 'Hide balance' : 'Show balance'}
            systemImage={balanceVisible ? 'eye.slash' : 'eye'}
            onPress={() => setBalanceVisible((visible) => !visible)}
            modifiers={[
              buttonStyle('plain'),
              labelStyle('iconOnly'),
              frame({
                width: componentTokens.headerControl.size,
                height: componentTokens.headerControl.size,
              }),
              background(colors.surface, shapes.circle()),
              strokeBorder({
                content: colors.borderStrong,
                style: { lineWidth: componentTokens.surface.borderWidth },
                shape: 'circle',
              }),
            ]}
          />
        </HStack>

        <Group modifiers={[padding({ top: wallet.balanceValueToMetrics })]}>
          <InsetLayer
            axis="horizontal"
            height={wallet.metricLayerHeight}
          >
            <MetricTile label={leftLabel} value={leftValue} width={tileWidth} currencySymbol={currencySymbol} />
            <MetricTile label={rightLabel} value={rightValue} width={tileWidth} currencySymbol={currencySymbol} />
          </InsetLayer>
        </Group>
      </VStack>
    </SurfacePanel>
  );
}
