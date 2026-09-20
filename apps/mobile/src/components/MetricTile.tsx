import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, screenTokens, typography } from '@/theme';

interface MetricTileProps {
  label: string;
  value: string;
  width: number;
  /** Small right-aligned figure beside the label, e.g. a share of the total. */
  trailingLabel?: string;
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
      <HStack alignment="firstTextBaseline" spacing={componentTokens.layer.gap}>
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {label}
        </Text>
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
