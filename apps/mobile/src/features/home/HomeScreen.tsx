import { useCallback } from 'react';

import { Group } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { BalanceSummary } from '@/components/BalanceSummary';
import { HomeRecentGroup } from '@/components/HomeRecentGroup';
import { PortfolioPullHint } from '@/components/PortfolioPullHint';
import { ShortcutRow } from '@/components/ShortcutRow';
import { TabHeader } from '@/components/TabHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { currencyCapability } from '@/data/capabilities';
import { getPortfolioTotals } from '@/domain/balance';
import { formatAmountNumber, toDisplayAmount } from '@/domain/money';
import { useMockAppState } from '@/state/mockAppState';
import { homeTokens, screenTokens, spacing } from '@/theme';

export function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { account, balances } = useMockAppState();
  const portfolio = getPortfolioTotals(balances);
  const capability = currencyCapability(account.displayCurrency);
  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  const totalValue = formatAmountNumber(toDisplayAmount(portfolio.total, account));
  const readyToUseValue = formatAmountNumber(toDisplayAmount(portfolio.readyToUse, account));
  const growingValue = formatAmountNumber(toDisplayAmount(portfolio.growing, account));

  const openPortfolio = useCallback(() => router.push('/portfolio'), [router]);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180} onPullPastTop={openPortfolio}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <TabHeader title="Home" />
      </Group>

      <PortfolioPullHint onPress={openPortfolio} />

      <Group modifiers={[padding({ top: screenTokens.wallet.headerToBalance })]}>
        <BalanceSummary
          totalValue={totalValue}
          currencySymbol={capability.symbol}
          width={contentWidth}
          leftLabel="Cash"
          leftSymbol="banknote.fill"
          leftValue={readyToUseValue}
          rightLabel="Invested"
          rightSymbol="lock.fill"
          rightValue={growingValue}
          onMoveToGrow={() =>
            router.push({ pathname: '/put-to-work', params: { origin: 'wallet' } })
          }
          onTakeMoneyOut={() => router.push('/withdraw')}
        />
      </Group>

      <Group modifiers={[padding({ top: screenTokens.wallet.detailsTopGap })]}>
        <ShortcutRow
          onPay={() => router.push('/send-money')}
          onWithdraw={() => router.push('/withdraw')}
          onReceive={() => router.push('/receive')}
        />
      </Group>

      <Group modifiers={[padding({ top: homeTokens.layout.shortcutRecentGap })]}>
        <HomeRecentGroup />
      </Group>
    </SwiftUIScreenShell>
  );
}
