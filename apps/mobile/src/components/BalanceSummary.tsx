import { Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { InsetActionRow } from '@/components/InsetActionRow';
import { InsetLayer } from '@/components/InsetLayer';
import { SurfacePanel } from '@/components/SurfacePanel';
import { colors, componentTokens, screenTokens, typography } from '@/theme';

interface BalanceSummaryProps {
  currencySymbol?: string;
  totalLabel?: string;
  totalValue: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  onMoveToGrow: () => void;
  onTakeMoneyOut: () => void;
  width?: number;
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
  onMoveToGrow,
  onTakeMoneyOut,
  width,
}: BalanceSummaryProps) {
  const wallet = screenTokens.wallet;
  const panelWidth = width ?? wallet.contentWidth;
  const metricWidth =
    (panelWidth
      - wallet.balancePaddingHorizontal * 2
      - componentTokens.layer.inset * 2
      - componentTokens.layer.gap * 2) / 2;

  return (
    <SurfacePanel
      width={panelWidth}
      cornerRadius={componentTokens.surface.panelRadius}
    >
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          padding({
            top: wallet.balancePaddingTop,
            horizontal: wallet.balancePaddingHorizontal,
            bottom: wallet.detailsBottomPadding,
          }),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {totalLabel ? (
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {totalLabel}
          </Text>
        ) : null}

        <HStack
          alignment="firstTextBaseline"
          spacing={4}
          modifiers={[
            padding({ top: totalLabel ? wallet.balanceTitleToValue : 0 }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.amountCurrency, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {totalValue}
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

        <Group modifiers={[padding({ top: wallet.balanceValueToMetrics })]}>
          <InsetLayer>
            <HStack
              alignment="center"
              spacing={componentTokens.layer.gap}
              modifiers={[frame({ maxWidth: Infinity, height: wallet.metricLayerHeight - componentTokens.layer.inset * 2 })]}
            >
              <MetricTile label={leftLabel} value={leftValue} width={metricWidth} currencySymbol={currencySymbol} />
              <MetricTile label={rightLabel} value={rightValue} width={metricWidth} currencySymbol={currencySymbol} />
            </HStack>
            <InsetActionRow
              label="Move to grow"
              symbol="arrow.right"
              onPress={onMoveToGrow}
            />
            <InsetActionRow
              label="Take money out"
              symbol="arrow.down.to.line"
              onPress={onTakeMoneyOut}
            />
          </InsetLayer>
        </Group>
      </VStack>
    </SurfacePanel>
  );
}
