import { Group, RNHostView } from '@expo/ui/swift-ui';
import { frame, padding } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AccountCardStack } from '@/components/AccountCardStack';
import { HomeRecentGroup } from '@/components/HomeRecentGroup';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ShortcutRow } from '@/components/ShortcutRow';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { currencyCapability } from '@/data/capabilities';
import { convertFromTry } from '@/domain/money';
import { useMockAppState } from '@/state/mockAppState';
import { homeTokens, spacing } from '@/theme';
import type { AccountSummary } from '@/types';

function HomeWalletHost({ account }: { account: AccountSummary }) {
  const { width: windowWidth } = useWindowDimensions();
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;
  const walletHeight = shellWidth * (
    homeTokens.layout.walletBaseHeight / homeTokens.layout.walletBaseWidth
  );

  return (
    <Group modifiers={[frame({ width: shellWidth, height: walletHeight, alignment: 'center' })]}>
      <RNHostView matchContents>
        <View style={[styles.walletShell, { width: shellWidth, height: walletHeight }]}>
          <AccountCardStack account={account} width={shellWidth} />
        </View>
      </RNHostView>
    </Group>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { account, balances } = useMockAppState();
  const totalTry = balances.available + balances.earning;
  const capability = currencyCapability(account.displayCurrency);
  const homeAccount: AccountSummary = {
    accountName: 'Trinqa Account',
    cardLabel: 'Account Balance',
    displayCurrency: capability.symbol,
    balance: convertFromTry(totalTry, account.displayCurrency).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };

  return (
    <SwiftUIScreenShell sectionGap={0}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.headerWalletGap })]}>
        <HomeWalletHost account={homeAccount} />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.walletShortcutGap })]}>
        <ShortcutRow
          onPay={() => router.push('/send-money')}
          onWithdraw={() => router.push('/withdraw')}
          onReceive={() => router.push('/receive')}
          onAccountDetails={() => router.push('/account-details')}
          onSettings={() => router.push('/settings')}
        />
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
