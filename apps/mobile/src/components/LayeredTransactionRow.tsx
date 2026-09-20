import { Button, HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  padding,
  offset,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { LayeredInfoBar } from '@/components/LayeredInfoBar';
import { colors, componentTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

interface LayeredTransactionRowProps {
  title: string;
  subtitle: string;
  amount: string;
  meta?: string;
  symbol?: SFSymbol;
  iconLetter?: string;
  footerLeadingText: string;
  footerTrailingText: string;
  footerSymbol?: SFSymbol;
  onFooterPress?: () => void;
  onPress?: () => void;
  /** VoiceOver hint for the card body. Footer uses `footerHint` when set. */
  hint?: string;
  footerHint?: string;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconLetterColor?: string;
  iconAccentText?: string;
  iconAccentColor?: string;
  footerLeadingColor?: string;
  footerTrailingColor?: string;
  /** Override the amount text color; defaults to textPrimary. Pass colors.success for yield rows. */
  amountColor?: string;
}

/** Shared Home-quality transaction card with a surface body and muted lower layer. */
export function LayeredTransactionRow({
  title,
  subtitle,
  amount,
  meta,
  symbol,
  iconLetter,
  footerLeadingText,
  footerTrailingText,
  footerSymbol,
  onFooterPress,
  onPress,
  hint = 'Opens the details.',
  footerHint,
  iconBackgroundColor = colors.surfaceLayer,
  iconColor = colors.textSecondary,
  iconLetterColor = colors.textSecondary,
  iconAccentText,
  iconAccentColor = colors.textSecondary,
  footerLeadingColor,
  footerTrailingColor,
  amountColor = colors.textPrimary,
}: LayeredTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();
  const row = componentTokens.transactionRow;
  const surface = componentTokens.surface;
  const body = (
    <HStack
      alignment="center"
      spacing={row.contentGap}
      modifiers={[
        padding({ horizontal: row.horizontalPadding, vertical: row.verticalPadding }),
        frame({ maxWidth: Infinity, height: row.mainHeight }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: surface.cardRadius })),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: surface.cardRadius,
        }),
        shadow({
          radius: componentTokens.layer.seamShadowRadius,
          y: componentTokens.layer.seamShadowY,
          color: componentTokens.layer.seamShadowColor,
        }),
      ]}
    >
      <ZStack
        modifiers={[
          frame({ width: row.iconSize, height: row.iconSize }),
          background(iconBackgroundColor, shapes.circle()),
        ]}
      >
        {symbol ? (
          <Image systemName={symbol} size={row.symbolSize} color={iconColor} />
        ) : (
          <ZStack>
            <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(iconLetterColor)]}>
              {initial}
            </Text>
            {iconAccentText ? (
              <Text modifiers={[font({ size: row.brandAccentSize, weight: 'bold' }), foregroundStyle(iconAccentColor), offset({ y: row.brandAccentOffsetY })]}>
                {iconAccentText}
              </Text>
            ) : null}
          </ZStack>
        )}
      </ZStack>

      <VStack alignment="leading" spacing={row.textGap} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: typography.label, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      </VStack>

      {/* trailing money column: trailing-aligned so meta sits centered under the amount */}
      <VStack alignment="trailing" spacing={row.textGap} modifiers={[layoutPriority(1), frame({ alignment: 'trailing' })]}>
        <Text modifiers={[font({ size: typography.label, weight: 'semibold' }), foregroundStyle(amountColor)]}>
          {amount}
        </Text>
        {meta ? (
          <Text modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
            lineLimit(1),
          ]}>
            {meta}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        background(colors.surfaceLayer, shapes.roundedRectangle({ cornerRadius: surface.cardRadius })),
        clipShape('roundedRectangle', surface.cardRadius),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: surface.cardRadius,
        }),
        shadow({
          radius: surface.rowLiftRadius,
          y: surface.rowLiftY,
          color: surface.rowLiftColor,
        }),
      ]}
    >
      {onPress ? (
        <Button
          onPress={onPress}
          modifiers={[
            buttonStyle('plain'),
            ...hitTargetModifiers({
              label: `${title}, ${amount}, ${meta ?? subtitle}`,
              hint,
            }),
            frame({ maxWidth: Infinity }),
          ]}
        >
          {body}
        </Button>
      ) : body}

      <LayeredInfoBar
        leadingText={footerLeadingText}
        trailingText={footerTrailingText}
        leadingSymbol={footerSymbol}
        onTrailingPress={onFooterPress}
        trailingHint={footerHint}
        height={row.footerHeight}
        horizontalPadding={row.horizontalPadding}
        leadingColor={footerLeadingColor}
        trailingColor={footerTrailingColor}
      />
    </VStack>
  );
}
