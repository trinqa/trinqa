import { useState } from 'react';

import { Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { ActivityChart } from '@/components/ActivityChart';
import { EarnDetailsPanel } from '@/components/EarnDetailsPanel';
import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { FlowInlineState } from '@/components/FlowStates';
import {
  earnChartPoints,
} from '@/data/mocks/earnAnalytics';
import { putToWorkRiskProfiles } from '@/data/mocks/putToWork';
import { formatLedgerMoney } from '@/domain/money';
import { earnTransactions, toEarnListItem } from '@/domain/transactionPresentation';
import { earnUnavailable, earnUnavailableReason } from '@/services/session';
import { useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens } from '@/theme';
import { captionTextModifiers } from '@/theme/swiftUi';
import type { EarnSegment } from '@/types';

const METRIC_WIDTHS = [112, 112, 112] as const;

export function EarnScreen() {
  const router = useRouter();
  const { account, balances, strategy, transactions, capabilities } = useMockAppState();
  const [segment, setSegment] = useState<EarnSegment>('earnings');
  const profile = putToWorkRiskProfiles.find((item) => item.id === strategy.risk) ?? putToWorkRiskProfiles[1];
  const dynamicItems = earnTransactions(transactions).map(toEarnListItem);
  const strategyItem = {
    id: 'current-strategy',
    title: profile.title,
    subtitle: 'Current strategy',
    amount: `${profile.estimatedApy.toFixed(1)}%`,
    meta: 'est. APY',
    footerLeadingText: 'Estimated APY',
    footerTrailingText: 'Manage Strategy',
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
    { id: 'apy', label: 'Current APY', value: `${profile.estimatedApy.toFixed(1)}%` },
    {
      id: 'balance',
      label: 'Earning Balance',
      value: formatLedgerMoney(balances.earning, account),
    },
    { id: 'risk', label: 'Risk', value: profile.title },
  ];
  const earn = screenTokens.earn;
  const providerBlocked = earnUnavailable(capabilities);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
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
            ...captionTextModifiers('medium'),
            font({ size: 16, weight: 'medium' }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          Total Earned
        </Text>
        <HStack alignment="firstTextBaseline" spacing={0}>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(colors.textSecondary)]}>
            +
          </Text>
          <Text modifiers={[font({ size: 25, weight: 'bold' }), foregroundStyle(colors.textPrimary)]}>
            {headline}
          </Text>
        </HStack>
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
            labelFontSize={metric.id === 'balance' ? 12 : undefined}
            value={metric.value}
            width={METRIC_WIDTHS[index] ?? 117}
          />
        ))}
      </HStack>

      {providerBlocked ? (
        <Group modifiers={[padding({ top: 12, leading: earn.contentHorizontalOffset })]}>
          <FlowInlineState
            symbol="exclamationmark.triangle"
            title="Earn unavailable"
            subtitle={earnUnavailableReason(capabilities)}
          />
        </Group>
      ) : null}

      <VStack modifiers={[padding({ top: earn.lowerPanelTopGap }), frame({ width: earn.contentWidth })]}>
        <EarnDetailsPanel
          segment={segment}
          onChange={setSegment}
          items={items}
          onManageStrategy={() =>
            router.push({ pathname: '/put-to-work', params: { origin: 'earn' } })
          }
        />
      </VStack>
    </SwiftUIScreenShell>
  );
}
