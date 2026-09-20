import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, screenTokens, typography } from '@/theme';

interface MetricTileProps {
  label: string;
  value: string;
  width: number;
  /** Small right-aligned figure beside the label, e.g. a share of the total. */
  trailingLabel?: string;
  /** Sits immediately after the label. Carries the tile's character — spendable, locked away. */
  symbol?: SFSymbol;
  valueColor?: string;
}

/**
 * The white tile that sits inside a gray `InsetLayer`. Home's balance panel
 * established it; Portfolio reuses it rather than growing a second tile.
 */
export function MetricTile({
  label,
  value,
  width,
  trailingLabel,
  symbol,
  valueColor = colors.textPrimary,
}: MetricTileProps) {
  return (
    <VStack
      alignment="leading"
      spacing={componentTokens.metricCard.textGap}
      modifiers={[
        padding({ horizontal: componentTokens.transactionRow.horizontalPadding }),
        frame({
          width,
          height: screenTokens.wallet.metricTileHeight,
          alignment: 'leading',
        }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
      ]}
    >
      <HStack alignment="center" spacing={5}>
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {label}
        </Text>
        {symbol ? (
          <Image systemName={symbol} size={typography.fine} color={colors.textSecondary} />
        ) : null}
        <Spacer />
        {trailingLabel ? (
          <Text
            modifiers={[
              font({ size: typography.fine, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {trailingLabel}
          </Text>
        ) : null}
      </HStack>

      <Text
        modifiers={[
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(valueColor),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {value}
      </Text>
    </VStack>
  );
}
