import { StyleSheet } from 'react-native';
import { Host, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

/**
 * Pay UI intentionally deferred until approved visual reference is provided.
 * This route exists only for native tab navigation wiring.
 */
export function PayPlaceholderScreen() {
  return (
    <ScreenContainer bottomInset>
      <Host style={styles.host}>
        <VStack
          spacing={8}
          alignment="center"
          modifiers={[padding({ horizontal: spacing.screenHorizontal })]}
        >
          <Text
            modifiers={[
              font({ size: typography.sectionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            Pay
          </Text>
          <Text
            modifiers={[
              font({ size: typography.caption }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            Pay UI intentionally deferred until approved visual reference is
            provided.
          </Text>
        </VStack>
      </Host>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'center',
  },
});
