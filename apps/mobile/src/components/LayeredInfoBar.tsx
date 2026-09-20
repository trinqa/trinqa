import { Button, HStack, Image, Spacer, Text } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

interface LayeredInfoBarProps {
  leadingText: string;
  trailingText: string;
  leadingSymbol?: SFSymbol;
  onTrailingPress?: () => void;
  trailingHint?: string;
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
  trailingHint,
  height = componentTokens.transactionRow.footerHeight,
  horizontalPadding = componentTokens.transactionRow.horizontalPadding,
  textSize = typography.fine,
  leadingColor,
  trailingColor,
}: LayeredInfoBarProps) {
  const resolvedLeadingColor = leadingColor ?? colors.textSecondary;
  const resolvedTrailingColor = trailingColor ?? (onTrailingPress ? colors.action : colors.textSecondary);

  const trailingLabel = (
    <Text
      modifiers={[
        font({ size: textSize, weight: onTrailingPress ? 'semibold' : 'medium' }),
        foregroundStyle(resolvedTrailingColor),
      ]}
    >
      {trailingText}
    </Text>
  );

  return (
    <HStack
      alignment="center"
      spacing={6}
      modifiers={[
        padding({ horizontal: horizontalPadding }),
        frame({ maxWidth: Infinity, height }),
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

      {onTrailingPress ? (
        <Button
          onPress={onTrailingPress}
          modifiers={[
            buttonStyle('plain'),
            ...hitTargetModifiers({
              label: trailingText,
              hint: trailingHint,
              minSize: true,
            }),
          ]}
        >
          {trailingLabel}
        </Button>
      ) : (
        trailingLabel
      )}
    </HStack>
  );
}
