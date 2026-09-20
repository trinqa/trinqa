import { useCallback, useState } from 'react';

import { Group } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { HomeRecentGroup } from '@/components/HomeRecentGroup';
import { PortfolioPullHint } from '@/components/PortfolioPullHint';
import { ShortcutRow } from '@/components/ShortcutRow';
import { TabHeader } from '@/components/TabHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { ValueSummary } from '@/components/ValueSummary';
import { currencyCapability } from '@/data/capabilities';
import { formatSharePercent } from '@/domain/balance';
import { formatAmountNumber, formatLedgerMoney, toDisplayAmount } from '@/domain/money';
import {
  earnedWithin,
  getPortfolioSplit,
  portfolioPeriods,
  resolvePeriod,
  type PortfolioPeriod,
} from '@/domain/portfolio';
import { useMockAppState } from '@/state/mockAppState';
import { homeTokens, screenTokens, spacing } from '@/theme';

export function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { account, balances, transactions } = useMockAppState();
  const [period, setPeriod] = useState<PortfolioPeriod>('1M');

  const split = getPortfolioSplit(balances);
  const capability = currencyCapability(account.displayCurrency);
  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  const totalValue = formatAmountNumber(toDisplayAmount(split.total, account));
  const cashValue = formatAmountNumber(toDisplayAmount(split.readyToUse, account));
  const investedValue = formatAmountNumber(toDisplayAmount(split.growing, account));
  const earned = earnedWithin(transactions, period);
  const gain = earned > 0 ? `+${formatLedgerMoney(earned, account)}` : undefined;
  // The column delta carries its own range, so the figure is never a number without a period.
  const gainInPeriod = gain ? `${gain} · ${period}` : undefined;

  const openPortfolio = useCallback(() => router.push('/portfolio'), [router]);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180} onPullPastTop={openPortfolio}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <TabHeader title="Home" />
      </Group>

      <PortfolioPullHint onPress={openPortfolio} />

      {/* The same card Portfolio opens with, so the pull lands somewhere recognisable. */}
      <Group modifiers={[padding({ top: screenTokens.wallet.headerToBalance })]}>
        <ValueSummary
          width={contentWidth}
          label="Total value"
          totalValue={totalValue}
          currencySymbol={capability.symbol}
          gain={gain}
          gainPeriod={resolvePeriod(period).caption}
          onGainPress={openPortfolio}
          primary={{
            label: 'Invested',
            symbol: 'lock.fill',
            value: `${investedValue} ${capability.symbol}`,
            share: formatSharePercent(split.growingShare),
            delta: gainInPeriod,
          }}
          secondary={{
            label: 'Cash',
            symbol: 'creditcard.fill',
            value: `${cashValue} ${capability.symbol}`,
            share: formatSharePercent(split.readyShare),
          }}
        />
      </Group>

      {/*
        Every money move in one row. Invest and Withdraw each used to have two homes
        — inside the balance card and again down here — while Receive hid behind a
        menu. Five small buttons beat three big ones plus a hidden two.
      */}
      <Group modifiers={[padding({ top: screenTokens.wallet.detailsTopGap })]}>
        <ShortcutRow
          onInvest={() => router.push({ pathname: '/put-to-work', params: { origin: 'wallet' } })}
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
