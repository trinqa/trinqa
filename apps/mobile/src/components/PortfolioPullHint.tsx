import { Button, HStack, Image, Text } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  symbolEffect,
} from '@expo/ui/swift-ui/modifiers';

import { colors, motion, screenTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

/**
 * The pull gesture is the nice way into Portfolio, but a gesture nobody is told
 * about is a feature nobody has. This says the gesture out loud and also works as
 * a plain button, so the screen is usable by someone who never discovers the drag.
 *
 * The chevron carries a periodic SF Symbol wiggle — the system's own animation, so
 * it runs on the UI thread and costs no re-renders. `wiggle` rather than `bounce`
 * because bounce scales the glyph, and the gesture being suggested is downward
 * travel, not emphasis. It is deliberately slow and spaced out: enough to suggest
 * the screen can be dragged, not enough to pull the eye off the balance below it.
 */
export function PortfolioPullHint({ onPress }: { onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label: 'Portfolio',
          hint: 'Opens your portfolio. You can also pull down from the top of this screen.',
          minSize: true,
          press: 'opacity',
        }),
      ]}
    >
      <HStack
        alignment="center"
        spacing={6}
        // Leading, or the 44pt hit box centres the row and it drifts away from the
        // title it sits under.
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Image
          systemName="chevron.down"
          size={typography.fine}
          color={colors.action}
          modifiers={[
            symbolEffect(
              { effect: 'wiggle', direction: 'down' },
              {
                options: {
                  repeat: { delay: motion.pullHint.repeatDelay },
                  speed: motion.pullHint.speed,
                },
              },
            ),
          ]}
        />
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
