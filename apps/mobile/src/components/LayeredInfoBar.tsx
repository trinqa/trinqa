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

interface LayeredInfoBarProps {
  leadingText: string;
  trailingText: string;
  leadingSymbol?: SFSymbol;
  onTrailingPress?: () => void;
  height?: number;
  horizontalPadding?: number;
  textSize?: number;
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
  textSize = typography.transactionAction,
  trailingColor,
}: LayeredInfoBarProps) {
  const resolvedTrailingColor = trailingColor ?? (onTrailingPress ? colors.action : colors.textSecondary);

  return (
    <HStack
      alignment="center"
      spacing={6}
      modifiers={[
        padding({ horizontal: horizontalPadding }),
        frame({ maxWidth: Infinity, height }),
      ]}
    >
      <Image systemName={leadingSymbol} size={11} color={colors.textSecondary} />
      <Text
        modifiers={[
          font({ size: textSize, weight: 'medium' }),
          foregroundStyle(colors.textSecondary),
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
            frame({ minWidth: 48, minHeight: 28, alignment: 'trailing' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: textSize, weight: 'semibold' }),
              foregroundStyle(resolvedTrailingColor),
            ]}
          >
            {trailingText}
          </Text>
        </Button>
      ) : (
        <Text
          modifiers={[
            font({ size: textSize, weight: 'medium' }),
            foregroundStyle(resolvedTrailingColor),
          ]}
        >
          {trailingText}
        </Text>
      )}
    </HStack>
  );
}
