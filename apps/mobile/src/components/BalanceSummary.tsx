import { Button, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { SurfacePanel } from '@/components/SurfacePanel';
import { InsetLayer } from '@/components/InsetLayer';
import { MetricTile } from '@/components/MetricTile';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

interface BalanceSummaryProps {
  currencySymbol?: string;
  totalValue: string;
  width: number;
  leftLabel: string;
  leftValue: string;
  leftSymbol?: SFSymbol;
  rightLabel: string;
  rightValue: string;
  rightSymbol?: SFSymbol;
  onMoveToGrow: () => void;
  onTakeMoneyOut: () => void;
}

/**
 * The two moves that change where money sits. `Move to grow` is the only cyan on Home:
 * it is the one decision the product wants made, and it sits beside the idle amount
 * that prompts it. `Take money out` stays a plain surface so the pair reads as
 * one suggestion and one escape hatch, not two equal buttons.
 */
function BalanceAction({
  label,
  symbol,
  tone,
  width,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  tone: 'accent' | 'neutral';
  width: number;
  onPress: () => void;
}) {
  const isAccent = tone === 'accent';
  const fill = isAccent ? colors.action : colors.surface;
  const ink = isAccent ? colors.textInverse : colors.textPrimary;
  const radius = componentTokens.surface.cardRadius;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label,
          shape: 'roundedRectangle',
          cornerRadius: radius,
          press: 'full',
        }),
      ]}
    >
      <HStack
        alignment="center"
        spacing={componentTokens.headerControl.gap}
        modifiers={[
          frame({ width, height: screenTokens.wallet.balanceActionHeight }),
          background(fill, shapes.roundedRectangle({ cornerRadius: radius })),
          clipShape('roundedRectangle', radius),
          ...(isAccent
            ? []
            : [
                strokeBorder({
                  content: colors.borderStrong,
                  style: { lineWidth: componentTokens.surface.borderWidth },
                  shape: 'roundedRectangle' as const,
                  cornerRadius: radius,
                }),
              ]),
        ]}
      >
        <Image systemName={symbol} size={typography.caption} color={ink} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'semibold' }),
            foregroundStyle(ink),
          ]}
        >
          {label}
        </Text>
      </HStack>
    </Button>
  );
}

export function BalanceSummary({
  currencySymbol = '$',
  totalValue,
  width,
  leftLabel,
  leftValue,
  leftSymbol,
  rightLabel,
  rightValue,
  rightSymbol,
  onMoveToGrow,
  onTakeMoneyOut,
}: BalanceSummaryProps) {
  const wallet = screenTokens.wallet;
  const layer = componentTokens.layer;
  // Everything inside the inset layer shares one column width, so the tiles above
  // and the actions below line up on the same two edges.
  const innerWidth = width - wallet.balancePaddingHorizontal * 2 - layer.inset * 2;
  const columnWidth = Math.floor((innerWidth - layer.gap) / 2);

  return (
    <SurfacePanel
      width={width}
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
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          Total money
        </Text>

        <HStack
          alignment="firstTextBaseline"
          spacing={layer.gap}
          modifiers={[
            padding({ top: wallet.balanceTitleToValue }),
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
          <Spacer />
        </HStack>

        <Group modifiers={[padding({ top: wallet.balanceValueToMetrics })]}>
          <InsetLayer height={wallet.metricLayerHeight}>
            <HStack alignment="center" spacing={layer.gap}>
              <MetricTile
                label={leftLabel}
                symbol={leftSymbol}
                value={`${leftValue} ${currencySymbol}`}
                width={columnWidth}
              />
              <MetricTile
                label={rightLabel}
                symbol={rightSymbol}
                value={`${rightValue} ${currencySymbol}`}
                width={columnWidth}
              />
            </HStack>

            <HStack alignment="center" spacing={layer.gap}>
              <BalanceAction
                label="Move to grow"
                symbol="arrow.up.right"
                tone="accent"
                width={columnWidth}
                onPress={onMoveToGrow}
              />
              <BalanceAction
                label="Take money out"
                symbol="arrow.down.to.line"
                tone="neutral"
                width={columnWidth}
                onPress={onTakeMoneyOut}
              />
            </HStack>
          </InsetLayer>
        </Group>
      </VStack>
    </SurfacePanel>
  );
}
