import { Button, Divider, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { SurfacePanel } from '@/components/SurfacePanel';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

export interface ValueColumn {
  label: string;
  value: string;
  symbol: SFSymbol;
  /** Share of the total, already formatted. Printed inside the bar, not beside it. */
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
  /** The range every figure on the card is measured over. */
  period?: {
    value: string;
    options: readonly { label: string; value: string }[];
    onChange: (next: string) => void;
  };
}

/**
 * A bar thick enough to hold its own labels. The thin track needed a legend
 * underneath repeating both figures, which is two rows of chrome to say what the
 * bar already showed.
 */
function ShareBar({
  width,
  primaryShare,
  primaryLabel,
  secondaryLabel,
}: {
  width: number;
  primaryShare: number;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const card = screenTokens.valueCard;
  const primaryWidth = Math.max(
    0,
    Math.min(width, Math.round((width - card.barGap) * primaryShare)),
  );

  return (
    <HStack spacing={card.barGap} modifiers={[frame({ width, height: card.barHeight })]}>
      <HStack
        alignment="center"
        modifiers={[
          padding({ horizontal: card.barLabelInset }),
          frame({ width: primaryWidth, height: card.barHeight }),
          background(
            {
              type: 'linearGradient',
              colors: [colors.action, colors.actionPrimaryDarker],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 },
            },
            shapes.roundedRectangle({ cornerRadius: card.barRadius }),
          ),
          clipShape('roundedRectangle', card.barRadius),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.caption, weight: 'semibold' }),
            foregroundStyle(colors.textInverse),
            lineLimit(1),
            fixedSize({ horizontal: true, vertical: false }),
          ]}
        >
          {primaryLabel}
        </Text>
        <Spacer />
      </HStack>

      <HStack
        alignment="center"
        modifiers={[
          padding({ horizontal: card.barLabelInset }),
          frame({ maxWidth: Infinity, height: card.barHeight }),
          background(
            colors.surfaceLayer,
            shapes.roundedRectangle({ cornerRadius: card.barRadius }),
          ),
          clipShape('roundedRectangle', card.barRadius),
        ]}
      >
        <Spacer />
        <Text
          modifiers={[
            font({ size: typography.caption, weight: 'semibold' }),
            foregroundStyle(colors.textSecondary),
            lineLimit(1),
            fixedSize({ horizontal: true, vertical: false }),
          ]}
        >
          {secondaryLabel}
        </Text>
      </HStack>
    </HStack>
  );
}

function Column({ column, width }: { column: ValueColumn; width: number }) {
  const card = screenTokens.valueCard;

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width, alignment: 'leading' })]}
    >
      <HStack alignment="center" spacing={card.columnIconToLabel}>
        <Image
          systemName={column.symbol}
          size={card.columnIconSize}
          color={colors.textSecondary}
        />
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {column.label}
        </Text>
        <Spacer />
      </HStack>

      <Text
        modifiers={[
          padding({ top: card.columnLabelToValue }),
          font({ size: typography.label, weight: 'bold' }),
          foregroundStyle(colors.textPrimary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {column.value}
      </Text>

      <Text
        modifiers={[
          padding({ top: card.columnValueToDelta }),
          font({ size: typography.footnote, weight: 'medium' }),
          foregroundStyle(column.delta ? colors.success : colors.textSecondary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {column.delta ?? '—'}
      </Text>
    </VStack>
  );
}

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
  period,
}: ValueSummaryProps) {
  const card = screenTokens.valueCard;
  const inner = width - card.paddingHorizontal * 2;
  const columnWidth = Math.floor((inner - card.dividerWidth - card.columnGap * 2) / 2);
  const primaryShare = Number.parseFloat(primary.share) / 100;

  const gainBlock = gain ? (
    <VStack alignment="trailing" spacing={1}>
      <HStack alignment="center" spacing={3}>
        <Image
          systemName="arrow.up.right"
          size={typography.footnote}
          color={colors.success}
        />
        <Text
          modifiers={[
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.success),
          ]}
        >
          {gain}
        </Text>
      </HStack>
      {gainPeriod ? (
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
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
        {/* Label and amount on the left, the movement on the right, one block. */}
        <HStack alignment="top" modifiers={[frame({ maxWidth: Infinity })]}>
          <VStack alignment="leading" spacing={card.labelToAmount}>
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {label}
            </Text>
            <HStack alignment="firstTextBaseline" spacing={componentTokens.layer.gap}>
              <Text
                modifiers={[
                  font({ size: typography.amountHero, weight: 'bold' }),
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
                  hint: 'What your invested money has earned.',
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
          <ShareBar
            width={inner}
            primaryShare={primaryShare}
            primaryLabel={primary.share}
            secondaryLabel={secondary.share}
          />
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

        {/*
          The range the movement is measured over. Without it the green figure is a
          number with no period attached, which is the one thing a return must have.
        */}
        {period ? (
          <Group modifiers={[padding({ top: card.periodTopGap })]}>
            <NativeSegmentedControl
              accessibilityLabel="Period"
              value={period.value}
              onChange={period.onChange}
              options={period.options}
              width={inner}
              height={card.periodHeight}
            />
          </Group>
        ) : null}
      </VStack>
    </SurfacePanel>
  );
}
