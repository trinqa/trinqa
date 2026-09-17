import { Group, RNHostView } from '@expo/ui/swift-ui';
import { frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AccountCardStack } from '@/components/AccountCardStack';
import { HomeRecentGroup } from '@/components/HomeRecentGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ShortcutRow } from '@/components/ShortcutRow';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { homeAccountSummary } from '@/data/mocks/home';
import { homeTokens, spacing } from '@/theme';

function HomeWalletHost() {
  const { width: windowWidth } = useWindowDimensions();
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;
  const walletHeight = shellWidth * (
    homeTokens.layout.walletBaseHeight / homeTokens.layout.walletBaseWidth
  );

  return (
    <Group modifiers={[frame({ width: shellWidth, height: walletHeight, alignment: 'center' })]}>
      <RNHostView matchContents>
        <View style={[styles.walletShell, { width: shellWidth, height: walletHeight }]}>
          <AccountCardStack account={homeAccountSummary} width={shellWidth} />
        </View>
      </RNHostView>
    </Group>
  );
}

export function HomeScreen() {
  return (
    <SwiftUIScreenShell sectionGap={0}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.headerWalletGap })]}>
        <HomeWalletHost />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.walletShortcutGap })]}>
        <ShortcutRow />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.shortcutRecentGap })]}>
        <HomeRecentGroup />
      </Group>
    </SwiftUIScreenShell>
  );
}

const styles = StyleSheet.create({
  walletShell: {
    overflow: 'visible',
  },
});
