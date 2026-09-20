import { useRef } from 'react';

import { Host, ScrollView, VStack } from '@expo/ui/swift-ui';
import {
  background,
  frame,
  onScrollPhaseChange,
  padding,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { colors, screenTokens, spacing } from '@/theme';

interface SwiftUIScreenShellProps {
  children: React.ReactNode;
  sectionGap?: number;
  bottomPadding?: number;
  /**
   * Called once when the user drags the screen past the reveal threshold and lets go.
   * Home uses it to open Portfolio; every other screen leaves it unset and scrolls normally.
   */
  onPullPastTop?: () => void;
}

/**
 * Root SwiftUI screen shell. Padding is applied before the full-width frame so
 * children receive the inset 366pt content proposal, not viewport+padding.
 */
export function SwiftUIScreenShell({
  children,
  sectionGap = spacing.lg,
  bottomPadding = spacing.scrollBottom,
  onPullPastTop,
}: SwiftUIScreenShellProps) {
  // The phase callback can fire more than once per gesture; this keeps one drag
  // from opening Portfolio twice.
  const armed = useRef(true);

  const pullModifiers: ViewModifier[] = onPullPastTop
    ? [
        onScrollPhaseChange((phase, geometry) => {
          const pulled = -geometry.contentOffsetY;
          if (phase === 'idle') {
            if (pulled < screenTokens.portfolio.pullRevealThreshold) armed.current = true;
            return;
          }
          if (!armed.current) return;
          if (pulled >= screenTokens.portfolio.pullRevealThreshold) {
            armed.current = false;
            onPullPastTop();
          }
        }),
      ]
    : [];

  return (
    <View style={styles.root}>
      <Host style={styles.host} useViewportSizeMeasurement>
        <ScrollView modifiers={[background(colors.background), ...pullModifiers]}>
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
