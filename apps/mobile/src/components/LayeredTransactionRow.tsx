import { HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  padding,
  offset,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { LayeredInfoBar } from '@/components/LayeredInfoBar';
import { colors, componentTokens, typography } from '@/theme';

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
  density?: 'standard' | 'compact';
  iconBackgroundColor?: string;
  iconColor?: string;
  iconLetterColor?: string;
  iconAccentText?: string;
  iconAccentColor?: string;
  footerTrailingColor?: string;
}

/** Shared Home-quality transaction card with a white body and muted lower layer. */
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
  density = 'standard',
  iconBackgroundColor = colors.surfaceSecondary,
  iconColor = colors.textSecondary,
  iconLetterColor = colors.textSecondary,
  iconAccentText,
  iconAccentColor = colors.textSecondary,
  footerTrailingColor,
}: LayeredTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();
  const baseRow = componentTokens.transactionRow;
  const row = density === 'compact' ? { ...baseRow, ...baseRow.compact } : baseRow;
  const surface = componentTokens.surface;
  const titleSize = density === 'compact' ? baseRow.compact.titleSize : typography.transactionTitle;
  const metaSize = density === 'compact' ? baseRow.compact.metaSize : typography.transactionMeta;
  const actionSize = density === 'compact' ? baseRow.compact.actionSize : typography.transactionAction;

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
          radius: surface.shadowRadius / 2,
          y: 1,
          color: '#00000008',
        }),
      ]}
    >
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
              <Text
                modifiers={[
                  font({ size: 14, weight: 'semibold' }),
                  foregroundStyle(iconLetterColor),
                ]}
              >
                {initial}
              </Text>
              {iconAccentText ? (
                <Text
                  modifiers={[
                    font({ size: baseRow.brandAccentSize, weight: 'bold' }),
                    foregroundStyle(iconAccentColor),
                    offset({ y: baseRow.brandAccentOffsetY }),
                  ]}
                >
                  {iconAccentText}
                </Text>
              ) : null}
            </ZStack>
          )}
        </ZStack>

        <VStack
          alignment="leading"
          spacing={row.textGap}
          modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
        >
          <Text
            modifiers={[
              font({ size: titleSize, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {title}
          </Text>
          <Text
            modifiers={[
              font({ size: metaSize }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {subtitle}
          </Text>
        </VStack>

        <VStack
          alignment="trailing"
          spacing={row.textGap}
          modifiers={[layoutPriority(1), frame({ alignment: 'trailing' })]}
        >
          <Text
            modifiers={[
              font({ size: titleSize, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {amount}
          </Text>
          {meta ? (
            <Text
              modifiers={[
                font({ size: metaSize }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {meta}
            </Text>
          ) : null}
        </VStack>
      </HStack>

      <LayeredInfoBar
        leadingText={footerLeadingText}
        trailingText={footerTrailingText}
        leadingSymbol={footerSymbol}
        onTrailingPress={onFooterPress}
        height={row.footerHeight}
        horizontalPadding={row.horizontalPadding}
        textSize={actionSize}
        trailingColor={footerTrailingColor}
      />
    </VStack>
  );
}
