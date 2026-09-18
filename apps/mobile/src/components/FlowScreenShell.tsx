import { Host, VStack } from '@expo/ui/swift-ui';
import { background, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface FlowScreenShellProps {
  children: React.ReactNode;
}

/** Fixed native SwiftUI flow shell shared by task-oriented full-screen routes. */
export function FlowScreenShell({ children }: FlowScreenShellProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Host style={styles.host} useViewportSizeMeasurement>
          <VStack
            alignment="leading"
            spacing={0}
            modifiers={[
              padding({
                top: spacing.headerTop,
                bottom: spacing.md,
                horizontal: spacing.screenHorizontal,
              }),
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
              background(colors.background),
            ]}
          >
            {children}
          </VStack>
        </Host>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  host: {
    flex: 1,
  },
});
