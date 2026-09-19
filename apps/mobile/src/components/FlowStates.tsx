import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PrimaryActionButton, SecondaryActionButton } from '@/components/FlowControls';
import { colors, componentTokens, screenTokens, typography } from '@/theme';

export function FlowInlineState({
  symbol,
  title,
  subtitle,
}: {
  symbol: SFSymbol;
  title: string;
  subtitle: string;
}) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[
        padding({ horizontal: 14, vertical: 12 }),
        frame({ width: screenTokens.addMoney.contentWidth, minHeight: 72 }),
        background(colors.surfaceLayer, shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius })),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.cardRadius,
        }),
      ]}
    >
      <Image systemName={symbol} size={18} color={colors.textPrimary} />
      <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: typography.footnote, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      </VStack>
    </HStack>
  );
}

export function FlowErrorState({
  title = 'Something went wrong',
  subtitle,
  onRetry,
  onCancel,
}: {
  title?: string;
  subtitle: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <VStack alignment="center" spacing={14} modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}>
      <Image systemName="exclamationmark.circle" size={42} color={colors.textSecondary} />
      <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
        {title}
      </Text>
      <Text modifiers={[font({ size: typography.body }), foregroundStyle(colors.textSecondary)]}>
        {subtitle}
      </Text>
      <PrimaryActionButton label="Try again" onPress={onRetry} />
      <SecondaryActionButton label="Cancel" onPress={onCancel} />
    </VStack>
  );
}

export function FlowEmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <VStack alignment="center" spacing={5} modifiers={[padding({ vertical: 28 }), frame({ maxWidth: Infinity })]}>
      <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
        {title}
      </Text>
      {subtitle ? (
        <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  );
}
