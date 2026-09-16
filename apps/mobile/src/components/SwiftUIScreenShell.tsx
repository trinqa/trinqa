import { Host, ScrollView, VStack } from '@expo/ui/swift-ui';
import { background, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

interface SwiftUIScreenShellProps {
  children: React.ReactNode;
  sectionGap?: number;
  bottomPadding?: number;
}

/**
 * Root SwiftUI screen shell. Padding is applied before the full-width frame so
 * children receive the inset 366pt content proposal, not viewport+padding.
 */
export function SwiftUIScreenShell({
  children,
  sectionGap = spacing.lg,
  bottomPadding = spacing.scrollBottom,
}: SwiftUIScreenShellProps) {
  return (
    <View style={styles.root}>
      <Host style={styles.host} useViewportSizeMeasurement>
        <ScrollView modifiers={[background(colors.background)]}>
          <VStack
            alignment="leading"
            spacing={sectionGap}
            modifiers={[
              background(colors.background),
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
    backgroundColor: colors.background,
  },
  host: {
    flex: 1,
  },
});
