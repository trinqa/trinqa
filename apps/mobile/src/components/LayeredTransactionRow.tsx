import { HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  clipShape,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  padding,
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
}: LayeredTransactionRowProps) {
  const initial = iconLetter ?? title.charAt(0).toUpperCase();
  const row = componentTokens.transactionRow;
  const surface = componentTokens.surface;

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
        ]}
      >
        <ZStack
          modifiers={[
            frame({ width: row.iconSize, height: row.iconSize }),
            background(colors.surfaceSecondary, shapes.circle()),
          ]}
        >
          {symbol ? (
            <Image systemName={symbol} size={row.symbolSize} color={colors.textSecondary} />
          ) : (
            <Text
              modifiers={[
                font({ size: 14, weight: 'semibold' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {initial}
            </Text>
          )}
        </ZStack>

        <VStack
          alignment="leading"
          spacing={row.textGap}
          modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
        >
          <Text
            modifiers={[
              font({ size: typography.transactionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {title}
          </Text>
          <Text
            modifiers={[
              font({ size: typography.transactionMeta }),
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
              font({ size: typography.transactionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {amount}
          </Text>
          {meta ? (
            <Text
              modifiers={[
                font({ size: typography.transactionMeta }),
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
      />
    </VStack>
  );
}
