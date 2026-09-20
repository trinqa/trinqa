import { Host, ScrollView, VStack } from '@expo/ui/swift-ui';
import { background, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { deepColors, spacing } from '@/theme';

interface DeepScreenShellProps {
  children: React.ReactNode;
  sectionGap?: number;
  bottomPadding?: number;
}

/**
 * The same shell as `SwiftUIScreenShell`, painted in deep mode. Portfolio is the
 * only screen that uses it: the background change is the whole point of the pull,
 * so it has to reach the scroll container, not just the cards inside it.
 */
export function DeepScreenShell({
  children,
  sectionGap = spacing.lg,
  bottomPadding = spacing.scrollBottom,
}: DeepScreenShellProps) {
  return (
    <View style={styles.root}>
      <Host style={styles.host} useViewportSizeMeasurement>
        <ScrollView modifiers={[background(deepColors.background)]}>
          <VStack
            alignment="leading"
            spacing={sectionGap}
            modifiers={[
              background(deepColors.background),
              padding({
                top: spacing.headerTop,
                bottom: bottomPadding,
                horizontal: spacing.screenHorizontal,
              }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            {children}
          </VStack>
        </ScrollView>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: deepColors.background,
  },
  host: {
    flex: 1,
  },
});
