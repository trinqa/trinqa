import { Host, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { captionTextModifiers, sectionTitleModifiers } from '@/theme/swiftUi';

/**
 * Pay UI intentionally deferred until approved visual reference is provided.
 */
export function PayPlaceholderScreen() {
  return (
    <View style={styles.root}>
      <Host style={styles.host} useViewportSizeMeasurement>
        <VStack
          modifiers={[
            background(colors.background),
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            padding({ horizontal: spacing.screenHorizontal }),
          ]}
        >
          <Spacer />
          <VStack alignment="center" spacing={8}>
            <Text modifiers={sectionTitleModifiers()}>Pay</Text>
            <Text modifiers={captionTextModifiers()}>
              Pay UI intentionally deferred until approved visual reference is
              provided.
            </Text>
          </VStack>
          <Spacer />
        </VStack>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  host: {
    flex: 1,
  },
});
