import { useState } from 'react';

import { Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { ActivityChart } from '@/components/ActivityChart';
import { EarnDetailsPanel } from '@/components/EarnDetailsPanel';
import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { TransactionDetailsSheet } from '@/components/TransactionDetailsSheet';
import { earnChartPoints } from '@/data/mocks/earnAnalytics';
import { putToWorkRiskProfiles } from '@/data/mocks/putToWork';
import { formatLedgerMoney } from '@/domain/money';
import { earnTransactions, toEarnListItem } from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing, typography } from '@/theme';
import type { EarnSegment, Transaction } from '@/types';

const METRIC_WIDTHS = [112, 112, 112] as const;

export function EarnScreen() {
  const router = useRouter();
  const { account, balances, strategy, transactions } = useMockAppState();
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

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader showProfile={false} title="Earn" showMenu />
      </Group>

      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          padding({ top: earn.headlineTopGap }),
          padding({ leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth, alignment: 'leading' }),
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
          <Text modifiers={[font({ size: typography.label, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            +
          </Text>
          <Text modifiers={[font({ size: typography.amountCurrency, weight: 'bold' }), foregroundStyle(colors.textPrimary)]}>
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
          padding({ top: earn.chartTopGap, leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth }),
        ]}
      >
        <ActivityChart points={earnChartPoints} />
      </VStack>

      <HStack
        spacing={earn.metricGap}
        modifiers={[
          padding({ top: earn.metricTopGap, leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth }),
        ]}
      >
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            width={METRIC_WIDTHS[index] ?? 117}
          />
        ))}
      </HStack>

      <VStack modifiers={[padding({ top: earn.lowerPanelTopGap }), frame({ width: earn.contentWidth })]}>
        <TransactionDetailsSheet
          transaction={selectedTransaction}
          onDismiss={() => setSelectedTransaction(null)}
          anchor={(
            <EarnDetailsPanel
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
