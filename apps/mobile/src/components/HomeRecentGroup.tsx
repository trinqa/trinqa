import { useState } from 'react';

import { Button, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { FlowEmptyState } from '@/components/FlowStates';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { TransactionDetailsSheet } from '@/components/TransactionDetailsSheet';
import {
  toActivityListItem,
  transactionStatusColor,
  transactionStatusLabel,
  transactionStatusSymbol,
} from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { hitTargetModifiers } from '@/theme/swiftUi';
import { colors, componentTokens, homeTokens, spacing, typography } from '@/theme';
import type { Transaction } from '@/types';

/** Recent grouped card follows the reference's narrow outer inset and compact rows. */
export function HomeRecentGroup() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { transactions } = useMockAppState();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;
  const recentActivity = transactions.slice(0, 3).map((transaction) => ({
    transaction,
    item: toActivityListItem(transaction),
  }));

  return (
    <TransactionDetailsSheet
      transaction={selectedTransaction}
      onDismiss={() => setSelectedTransaction(null)}
      anchor={(
        <Group modifiers={[frame({ width: shellWidth, alignment: 'center' })]}>
          <VStack
            alignment="leading"
            spacing={homeTokens.recent.titleRowsGap}
            modifiers={[
              padding({
                top: homeTokens.recent.topPadding,
                bottom: homeTokens.recent.bottomPadding,
                horizontal: homeTokens.recent.horizontalPadding,
              }),
              background(
                colors.surface,
                shapes.roundedRectangle({ cornerRadius: componentTokens.surface.panelRadius }),
              ),
              strokeBorder({
                content: colors.borderStrong,
                style: { lineWidth: componentTokens.surface.borderWidth },
                shape: 'roundedRectangle',
                cornerRadius: componentTokens.surface.panelRadius,
              }),
              shadow({
                radius: componentTokens.surface.shadowRadius,
                y: componentTokens.surface.shadowY,
                color: componentTokens.surface.shadowColor,
              }),
              frame({ width: homeTokens.recent.width, alignment: 'leading' }),
            ]}
          >
            {/*
              Recent is three rows and then a dead end. It is not a place to filter
              from — Activity already does that, with its own segments and a full
              dated list — so what it owes the reader is a way through to it.
            */}
            <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity })]}>
              <Text
                modifiers={[
                  font({ size: typography.kicker, weight: 'semibold' }),
                  foregroundStyle(colors.textPrimary),
                ]}
              >
                Recent
              </Text>
              <Spacer />
              <Button
                onPress={() => router.push('/activity')}
                modifiers={[
                  buttonStyle('plain'),
                  ...hitTargetModifiers({
                    label: 'See all activity',
                    minSize: true,
                    shape: 'roundedRectangle',
                    cornerRadius: componentTokens.surface.controlRadius,
                    press: 'opacity',
                  }),
                ]}
              >
                <HStack alignment="center" spacing={3}>
                  <Text
                    modifiers={[
                      font({ size: typography.footnote, weight: 'semibold' }),
                      foregroundStyle(colors.action),
                    ]}
                  >
                    See all
                  </Text>
                  <Image
                    systemName="chevron.right"
                    size={typography.micro}
                    color={colors.action}
                  />
                </HStack>
              </Button>
            </HStack>

            <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
              {recentActivity.length === 0 ? (
                <FlowEmptyState title="Nothing yet" subtitle="Your latest money movements will show up here." />
              ) : null}
              {recentActivity.map(({ item, transaction }) => (
                <LayeredTransactionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  amount={item.amount}
                  meta={item.timestamp}
                  symbol={item.symbol}
                  footerLeadingText={transactionStatusLabel(transaction.status)}
                  footerSymbol={transactionStatusSymbol(transaction.status)}
                  footerLeadingColor={transactionStatusColor(transaction.status)}
                  footerTrailingText="Details"
                  onFooterPress={() => setSelectedTransaction(transaction)}
                  onPress={() => setSelectedTransaction(transaction)}
                />
              ))}
            </VStack>
          </VStack>
        </Group>
      )}
    />
  );
}
