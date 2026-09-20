import { Button, HStack, Image, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, typography } from '@/theme';

interface LayeredInfoBarProps {
  leadingText: string;
  trailingText: string;
  leadingSymbol?: SFSymbol;
  onTrailingPress?: () => void;
  height?: number;
  horizontalPadding?: number;
  textSize?: number;
  leadingColor?: string;
  trailingColor?: string;
}

/** Reusable muted layer used below primary white card content. */
export function LayeredInfoBar({
  leadingText,
  trailingText,
  leadingSymbol = 'checkmark.circle.fill',
  onTrailingPress,
  height = componentTokens.transactionRow.footerHeight,
  horizontalPadding = componentTokens.transactionRow.horizontalPadding,
  textSize = typography.fine,
  leadingColor,
  trailingColor,
}: LayeredInfoBarProps) {
  const resolvedLeadingColor = leadingColor ?? colors.textSecondary;
  const resolvedTrailingColor = trailingColor ?? (onTrailingPress ? colors.action : colors.textSecondary);

  const content = (
    <HStack
      alignment="center"
      spacing={6}
      modifiers={[
        padding({ horizontal: horizontalPadding }),
        frame({ maxWidth: Infinity, height }),
        // The bar has no background of its own and a Spacer in the middle, so without a
        // content shape only the two text runs would answer the Button's taps.
        contentShape(shapes.rectangle()),
      ]}
    >
      <Image systemName={leadingSymbol} size={11} color={resolvedLeadingColor} />
      <Text
        modifiers={[
          font({ size: textSize, weight: 'medium' }),
          foregroundStyle(resolvedLeadingColor),
        ]}
      >
        {leadingText}
      </Text>

      <Spacer />

      <Text
        modifiers={[
          font({ size: textSize, weight: onTrailingPress ? 'semibold' : 'medium' }),
          foregroundStyle(resolvedTrailingColor),
        ]}
      >
        {trailingText}
      </Text>
    </HStack>
  );

  if (!onTrailingPress) return content;

  return (
    <Button
      onPress={onTrailingPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(trailingText),
        frame({ maxWidth: Infinity, height }),
      ]}
    >
      {content}
    </Button>
  );
}
