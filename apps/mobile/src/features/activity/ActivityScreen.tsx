import { useEffect, useState } from 'react';

import { Group, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams } from 'expo-router';

import { ActivitySegmentPicker } from '@/components/ActivitySegmentPicker';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { FlowEmptyState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { TransactionDetailsSheet } from '@/components/TransactionDetailsSheet';
import { toActivityListItem, transactionSection } from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing, typography } from '@/theme';
import type { ActivitySegment, Transaction } from '@/types';

export function ActivityScreen() {
  const params = useLocalSearchParams<{ segment?: string; transactionId?: string }>();
  const { transactions } = useMockAppState();
  const [segment, setSegment] = useState<ActivitySegment>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const activity = screenTokens.activity;
  const activityItems = transactions.map(toActivityListItem);
  const filteredItems = activityItems.filter(
    (item) => segment === 'all' || item.category === segment,
  );
  const sections = Array.from(
    new Map(
      transactions
        .filter((transaction) => filteredItems.some((item) => item.id === transaction.id))
        .map((transaction) => {
          const section = transactionSection(transaction);
          return [section.id, section];
        }),
    ).values(),
  ).map((section) => ({ ...section, items: filteredItems.filter((item) => item.group === section.id) }));

  useEffect(() => {
    const requestedSegment = Array.isArray(params.segment) ? params.segment[0] : params.segment;
    if (requestedSegment === 'payments') setSegment('payments');
    const transactionId = Array.isArray(params.transactionId) ? params.transactionId[0] : params.transactionId;
    if (transactionId) setSelectedTransaction(transactions.find((item) => item.id === transactionId) ?? null);
  }, [params.segment, params.transactionId, transactions]);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
        <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
          <ScreenHeader />
        </Group>

        <VStack
          alignment="leading"
          spacing={activity.titleSubtitleGap}
          modifiers={[
            padding({ top: activity.headerToTitle }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.pageTitle, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            Activity
          </Text>
          <Text
            modifiers={[
              font({ size: typography.body }),
              foregroundStyle(colors.textSecondary),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            Everything that happened to your money.
          </Text>
        </VStack>

        <Group modifiers={[padding({ top: activity.subtitleToSegment })]}>
          <ActivitySegmentPicker segment={segment} onChange={setSegment} />
        </Group>

        <Group modifiers={[padding({ top: activity.segmentToPanel })]}>
          <TransactionDetailsSheet
            transaction={selectedTransaction}
            onDismiss={() => setSelectedTransaction(null)}
            anchor={
              sections.length > 0 ? (
                <ActivityTimeline
                  sections={sections}
                  onSelect={(id) => setSelectedTransaction(transactions.find((item) => item.id === id) ?? null)}
                />
              ) : (
                <FlowEmptyState title="No activity yet." subtitle="Your activity will appear here." />
              )
            }
          />
        </Group>
      </VStack>
    </SwiftUIScreenShell>
  );
}
