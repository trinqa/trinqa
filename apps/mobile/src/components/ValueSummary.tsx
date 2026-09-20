import { Button, Divider, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { SurfacePanel } from '@/components/SurfacePanel';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

export interface ValueColumn {
  label: string;
  value: string;
  symbol: SFSymbol;
  /** Share of the total, printed beside the figure it belongs to. */
  share: string;
  /** What this column did over the period. Absent reads as an em dash. */
  delta?: string;
}

interface ValueSummaryProps {
  width: number;
  label: string;
  totalValue: string;
  currencySymbol: string;
  /** The headline movement. Green, and the only warm thing on the card. */
  gain?: string;
  gainPeriod?: string;
  onGainPress?: () => void;
  /** Drawn first and filled; this is the share the bar's blue segment represents. */
  primary: ValueColumn;
  secondary: ValueColumn;
}

/** Two segments, no labels. The figures they stand for are directly underneath. */
function ShareBar({ width, primaryShare }: { width: number; primaryShare: number }) {
  const card = screenTokens.valueCard;
  const primaryWidth = Math.max(
    0,
    Math.min(width, Math.round((width - card.barGap) * primaryShare)),
  );

  return (
    <HStack spacing={card.barGap} modifiers={[frame({ width, height: card.barHeight })]}>
      <Group
        modifiers={[
          frame({ width: primaryWidth, height: card.barHeight }),
          background(colors.action, shapes.roundedRectangle({ cornerRadius: card.barRadius })),
          clipShape('roundedRectangle', card.barRadius),
        ]}
      >
        <Spacer />
      </Group>
      <Group
        modifiers={[
          frame({ maxWidth: Infinity, height: card.barHeight }),
          background(
            colors.surfaceLayer,
            shapes.roundedRectangle({ cornerRadius: card.barRadius }),
          ),
          clipShape('roundedRectangle', card.barRadius),
        ]}
      >
        <Spacer />
      </Group>
    </HStack>
  );
}

function Column({ column, width }: { column: ValueColumn; width: number }) {
  const card = screenTokens.valueCard;

  return (
    <VStack alignment="leading" spacing={0} modifiers={[frame({ width, alignment: 'leading' })]}>
      <HStack alignment="center" spacing={card.columnIconToLabel}>
        <Image
          systemName={column.symbol}
          size={typography.footnote}
          color={colors.textSecondary}
        />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {column.label}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: typography.fine, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {column.share}
        </Text>
      </HStack>

      <Text
        modifiers={[
          padding({ top: card.columnLabelToValue }),
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {column.value}
      </Text>

      <Text
        modifiers={[
          padding({ top: card.columnValueToDelta }),
          font({ size: typography.fine, weight: 'medium' }),
          foregroundStyle(column.delta ? colors.success : colors.textSecondary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {column.delta ?? '—'}
      </Text>
    </VStack>
  );
}

/**
 * The balance, the split, and what it did. Home and Portfolio both open on it, so
 * the pull between them lands on something already read once.
 */
export function ValueSummary({
  width,
  label,
  totalValue,
  currencySymbol,
  gain,
  gainPeriod,
  onGainPress,
  primary,
  secondary,
}: ValueSummaryProps) {
  const card = screenTokens.valueCard;
  const inner = width - card.paddingHorizontal * 2;
  const columnWidth = Math.floor((inner - card.dividerWidth - card.columnGap * 2) / 2);
  const primaryShare = Number.parseFloat(primary.share) / 100;

  const gainBlock = gain ? (
    <VStack alignment="trailing" spacing={1}>
      <HStack alignment="center" spacing={3}>
        <Image systemName="arrow.up.right" size={typography.footnote} color={colors.success} />
        <Text
          modifiers={[
            font({ size: typography.label, weight: 'semibold' }),
            foregroundStyle(colors.success),
          ]}
        >
          {gain}
        </Text>
      </HStack>
      {gainPeriod ? (
        <Text
          modifiers={[
            font({ size: typography.fine, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {gainPeriod}
        </Text>
      ) : null}
    </VStack>
  ) : null;

  return (
    <SurfacePanel width={width} cornerRadius={componentTokens.surface.panelRadius}>
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          padding({
            top: card.paddingTop,
            bottom: card.paddingBottom,
            horizontal: card.paddingHorizontal,
          }),
          frame({ maxWidth: Infinity, alignment: 'topLeading' }),
        ]}
      >
        <HStack alignment="top" modifiers={[frame({ maxWidth: Infinity })]}>
          <VStack alignment="leading" spacing={card.labelToAmount}>
            <Text
              modifiers={[
                font({ size: typography.footnote, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {label}
            </Text>
            <HStack alignment="firstTextBaseline" spacing={componentTokens.layer.gap}>
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
          </VStack>

          <Spacer />

          {gainBlock && onGainPress ? (
            <Button
              onPress={onGainPress}
              modifiers={[
                buttonStyle('plain'),
                ...hitTargetModifiers({
                  label: `Gained ${gain} ${gainPeriod ?? ''}`.trim(),
                  minSize: true,
                  shape: 'roundedRectangle',
                  cornerRadius: componentTokens.surface.controlRadius,
                  press: 'opacity',
                }),
              ]}
            >
              {gainBlock}
            </Button>
          ) : (
            gainBlock
          )}
        </HStack>

        <Group modifiers={[padding({ top: card.amountToBar })]}>
          <ShareBar width={inner} primaryShare={primaryShare} />
        </Group>

        <HStack
          alignment="top"
          spacing={card.columnGap}
          modifiers={[padding({ top: card.barToColumns }), frame({ width: inner })]}
        >
          <Column column={primary} width={columnWidth} />
          <Divider modifiers={[frame({ height: card.dividerHeight })]} />
          <Column column={secondary} width={columnWidth} />
        </HStack>
      </VStack>
    </SurfacePanel>
  );
}
