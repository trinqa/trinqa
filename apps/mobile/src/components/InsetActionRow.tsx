import { Button, HStack, Image, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

export function InsetActionRow({
  label,
  onPress,
  symbol,
  isSheetAnchor = false,
}: {
  label: string;
  onPress?: () => void;
  symbol: SFSymbol;
  isSheetAnchor?: boolean;
}) {
  const content = (
    <HStack
      spacing={8}
      modifiers={[
        padding({ horizontal: screenTokens.wallet.filterChipPaddingX }),
        frame({ maxWidth: Infinity, height: screenTokens.wallet.filterChipHeight }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle' as const,
          cornerRadius: componentTokens.surface.cardRadius,
        }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {label}
      </Text>
      <Spacer />
      <Image systemName={symbol} size={componentTokens.headerControl.symbolSize} color={colors.textPrimary} />
    </HStack>
  );

  if (isSheetAnchor) return content;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label,
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.cardRadius,
          press: 'opacity',
        }),
      ]}
    >
      {content}
    </Button>
  );
}
