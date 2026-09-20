import { useState } from 'react';

import { useWindowDimensions } from 'react-native';

import { Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { ActivityChart } from '@/components/ActivityChart';
import { EarnDetailsPanel } from '@/components/EarnDetailsPanel';
import { FlowInlineState } from '@/components/FlowStates';
import { MetricCard } from '@/components/MetricCard';
import { TabHeader } from '@/components/TabHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { TransactionDetailsSheet } from '@/components/TransactionDetailsSheet';
import { earnChartPoints } from '@/data/mocks/earnAnalytics';
import { putToWorkRiskProfiles } from '@/data/mocks/putToWork';
import { formatLedgerMoney } from '@/domain/money';
import { earnTransactions, toEarnListItem } from '@/domain/transactionPresentation';
import { earnUnavailable, earnUnavailableReason } from '@/services/session';
import { useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing, typography } from '@/theme';
import type { EarnSegment, Transaction } from '@/types';


export function EarnScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { account, balances, strategy, transactions, capabilities } = useMockAppState();
  const providerBlocked = earnUnavailable(capabilities);
  const [segment, setSegment] = useState<EarnSegment>('earnings');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const profile = putToWorkRiskProfiles.find((item) => item.id === strategy.risk) ?? putToWorkRiskProfiles[1];
  const dynamicItems = earnTransactions(transactions).map(toEarnListItem);
  const strategyItem = {
    id: 'current-strategy',
    title: profile.title,
    subtitle: 'Your plan',
    amount: `${profile.estimatedApy.toFixed(1)}%`,
    meta: 'yearly return',
    footerLeadingText: 'Yearly return',
    footerTrailingText: 'Change plan',
    symbol: 'chart.line.uptrend.xyaxis' as const,
    iconStyle: 'strategy' as const,
    segment: 'strategies' as const,
    action: 'manage-strategy' as const,
  };
  const items = [strategyItem, ...dynamicItems].filter((item) => item.segment === segment);
  const yieldEarned = transactions
    .filter((transaction) => transaction.type === 'yield-earned')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const headline = formatLedgerMoney(yieldEarned, account);
  const metrics = [
    { id: 'apy', label: 'Yearly return', value: `${profile.estimatedApy.toFixed(1)}%` },
    {
      id: 'balance',
      label: 'Money growing',
      value: formatLedgerMoney(balances.earning, account),
    },
    { id: 'risk', label: 'How risky', value: profile.riskLabel },
  ];
  const earn = screenTokens.earn;
  // One content width for the whole screen. The chart, the metrics and the lower
  // panel used to be 350, 350 and 374 wide at three different offsets, which put
  // three left edges on one screen.
  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  const metricWidth = Math.floor((contentWidth - earn.metricGap * 2) / 3);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <TabHeader title="Earn" />
      </Group>

      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          padding({ top: screenTokens.tabHeader.toContent }),
          frame({ width: contentWidth, alignment: 'leading' }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          You've earned
        </Text>
        <HStack alignment="firstTextBaseline" spacing={4}>
          <Text modifiers={[font({ size: typography.label, weight: 'medium' }), foregroundStyle(colors.success)]}>
            +
          </Text>
          <Text modifiers={[font({ size: typography.amountCurrency, weight: 'bold' }), foregroundStyle(colors.success)]}>
            {headline}
          </Text>
        </HStack>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          This is extra money your savings made.
        </Text>
      </VStack>

      <VStack
        modifiers={[
          padding({ top: earn.chartTopGap }),
          frame({ width: contentWidth }),
        ]}
      >
        <ActivityChart points={earnChartPoints} />
      </VStack>

      <HStack
        spacing={earn.metricGap}
        modifiers={[
          padding({ top: earn.metricTopGap }),
          frame({ width: contentWidth }),
        ]}
      >
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            width={metricWidth}
          />
        ))}
      </HStack>

      {providerBlocked ? (
        <Group modifiers={[padding({ top: spacing.row })]}>
          <FlowInlineState
            symbol="exclamationmark.triangle"
            title="Earn unavailable"
            subtitle={earnUnavailableReason(capabilities)}
          />
        </Group>
      ) : null}

      <VStack modifiers={[padding({ top: earn.lowerPanelTopGap }), frame({ width: contentWidth })]}>
        <TransactionDetailsSheet
          transaction={selectedTransaction}
          onDismiss={() => setSelectedTransaction(null)}
          anchor={(
            <EarnDetailsPanel
              width={contentWidth}
              segment={segment}
              onChange={setSegment}
              items={items}
              onManageStrategy={() =>
                router.push({ pathname: '/put-to-work', params: { origin: 'earn' } })
              }
              onSelectTransaction={(id) =>
                setSelectedTransaction(transactions.find((transaction) => transaction.id === id) ?? null)
              }
            />
          )}
        />
      </VStack>
    </SwiftUIScreenShell>
  );
}
