import { Group, RNHostView } from '@expo/ui/swift-ui';
import { frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AccountCardStack } from '@/components/AccountCardStack';
import { HomeRecentGroup } from '@/components/HomeRecentGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ShortcutRow } from '@/components/ShortcutRow';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { homeAccountSummary } from '@/data/mocks/home';
import { spacing } from '@/theme';

const WALLET_HEIGHT = 262;
const WALLET_VISUAL_WIDTH = 380;
const HEADER_WALLET_GAP = 18;
const WALLET_SHORTCUT_GAP = 27;
const SHORTCUT_GROUP_GAP = 22;

function HomeWalletHost() {
  const { width: windowWidth } = useWindowDimensions();
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;
  const walletBleed = (WALLET_VISUAL_WIDTH - shellWidth) / 2;

  return (
    <Group modifiers={[frame({ width: shellWidth, height: WALLET_HEIGHT, alignment: 'center' })]}>
      <RNHostView matchContents>
        <View style={[styles.walletShell, { width: shellWidth, height: WALLET_HEIGHT }]}>
          <View
            style={[
              styles.walletVisual,
              {
                width: WALLET_VISUAL_WIDTH,
                height: WALLET_HEIGHT,
                left: -walletBleed,
              },
            ]}
          >
            <AccountCardStack account={homeAccountSummary} width={WALLET_VISUAL_WIDTH} />
          </View>
        </View>
      </RNHostView>
    </Group>
  );
}

export function HomeScreen() {
  return (
    <SwiftUIScreenShell sectionGap={0}>
      <ScreenHeader />

      <Group modifiers={[padding({ top: HEADER_WALLET_GAP })]}>
        <HomeWalletHost />
      </Group>

      <Group modifiers={[padding({ top: WALLET_SHORTCUT_GAP })]}>
        <ShortcutRow />
      </Group>

      <Group modifiers={[padding({ top: SHORTCUT_GROUP_GAP })]}>
        <HomeRecentGroup />
      </Group>
    </SwiftUIScreenShell>
  );
}

const styles = StyleSheet.create({
  walletShell: {
    overflow: 'visible',
  },
  walletVisual: {
    position: 'absolute',
    top: 0,
  },
});
