import { Button, HStack, Image, Text } from '@expo/ui/swift-ui';
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';

import { colors, screenTokens, typography } from '@/theme';

/**
 * The pull gesture is the nice way into Portfolio, but a gesture nobody is told
 * about is a feature nobody has. This says the gesture out loud and also works as
 * a plain button, so the screen is usable by someone who never discovers the drag.
 */
export function PortfolioPullHint({ onPress }: { onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel('Portfolio'),
        accessibilityHint('Opens your portfolio. You can also pull down from the top of this screen.'),
      ]}
    >
      <HStack
        alignment="center"
        spacing={6}
        modifiers={[
          frame({ maxWidth: Infinity, height: screenTokens.portfolio.pullHintHeight }),
        ]}
      >
        <Image systemName="arrow.down" size={typography.fine} color={colors.textSecondary} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          Pull down for Portfolio
        </Text>
      </HStack>
    </Button>
  );
}
