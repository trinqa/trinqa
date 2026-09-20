import { useState } from 'react';

import {
  Button,
  Group,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { BalanceSummary } from '@/components/BalanceSummary';
import { DateSectionDivider } from '@/components/DateSectionDivider';
import { InsetLayer } from '@/components/InsetLayer';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SurfacePanel } from '@/components/SurfacePanel';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { TransactionDetailsSheet } from '@/components/TransactionDetailsSheet';
import { currencyCapability } from '@/data/capabilities';
import { toDisplayAmount } from '@/domain/money';
import {
  toActivityListItem,
  transactionSection,
  transactionStatusColor,
  transactionStatusLabel,
  transactionStatusSymbol,
  walletTransactions,
} from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import type { Transaction } from '@/types';

function formatBalance(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function WalletActionRow({
  label,
  onPress,
  symbol,
}: {
  label: string;
  onPress: () => void;
  symbol: 'arrow.right' | 'arrow.down.to.line';
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        padding({ horizontal: screenTokens.wallet.filterChipPaddingX }),
        frame({ maxWidth: Infinity, height: screenTokens.wallet.filterChipHeight }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.cardRadius,
        }),
      ]}
    >
      <HStack
        spacing={8}
        modifiers={[
          frame({ maxWidth: Infinity }),
          // The chip background is on the Button, so the Spacer between the label and the
          // chevron is transparent to hit-testing without a content shape of its own.
          contentShape(shapes.rectangle()),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.label, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {label}
        </Text>
        <Spacer />
        <Image systemName={symbol} size={componentTokens.headerControl.symbolSize} color={colors.textPrimary} />
      </HStack>
    </Button>
  );
}

export function WalletScreen() {
  const router = useRouter();
  const { account, balances, transactions } = useMockAppState();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const wallet = screenTokens.wallet;
  const transactionContentWidth =
    wallet.contentWidth - wallet.detailsHorizontalPadding * 2;
  const walletTotal = balances.available + balances.earning;
  const capability = currencyCapability(account.displayCurrency);
  const walletActivity = walletTransactions(transactions).map((transaction) => ({
    transaction,
    item: toActivityListItem(transaction),
  }));
  const sections = Array.from(
    new Map(
      walletActivity.map(({ transaction }) => {
        const section = transactionSection(transaction);
        return [section.id, section];
      }),
    ).values(),
  ).map((section) => ({
    ...section,
    rows: walletActivity.filter(({ item }) => item.group === section.id),
  }));

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader />
      </Group>

      <VStack modifiers={[padding({ top: wallet.headerToBalance })]}>
        <BalanceSummary
          totalLabel="Your money"
          totalValue={formatBalance(toDisplayAmount(walletTotal, account))}
          currencySymbol={capability.symbol}
          leftLabel="Ready to use"
          leftValue={formatBalance(toDisplayAmount(balances.available, account))}
          rightLabel="Growing"
          rightValue={formatBalance(toDisplayAmount(balances.earning, account))}
        />
      </VStack>

      <VStack modifiers={[padding({ top: wallet.detailsTopGap })]}>
        <SurfacePanel width={wallet.contentWidth}>
          <VStack
            alignment="leading"
            spacing={0}
            modifiers={[
              padding({
                top: wallet.detailsTopPadding,
                horizontal: wallet.detailsHorizontalPadding,
                bottom: wallet.detailsBottomPadding,
              }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            <Text
              modifiers={[
                font({ size: typography.kicker, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              Move money
            </Text>

            <Group modifiers={[padding({ top: wallet.titleToLimitCard })]}>
              <InsetLayer>
                <WalletActionRow
                  label="Move money to grow"
                  symbol="arrow.right"
                  onPress={() =>
                    router.push({ pathname: '/put-to-work', params: { origin: 'wallet' } })
                  }
                />
                <WalletActionRow
                  label="Take money out"
                  symbol="arrow.down.to.line"
                  onPress={() => router.push('/withdraw')}
                />
              </InsetLayer>
            </Group>

            <Text
              modifiers={[
                padding({ top: wallet.transactionTopGap }),
                font({ size: typography.kicker, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              Recent
            </Text>

            <TransactionDetailsSheet
              transaction={selectedTransaction}
              onDismiss={() => setSelectedTransaction(null)}
              anchor={(
                <VStack alignment="leading" spacing={0}>
                  {sections.map((section, index) => (
                    <VStack key={section.id} alignment="leading" spacing={componentTokens.dateSectionDivider.toRowsGap}>
                      <DateSectionDivider
                        contentWidth={transactionContentWidth}
                        label={section.title}
                        modifiers={[padding({ top: index === 0 ? wallet.transactionTitleToGroup : 12 })]}
                      />
                      <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
                        {section.rows.map(({ item, transaction }) => (
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
                  ))}
                </VStack>
              )}
            />
          </VStack>
        </SurfacePanel>
      </VStack>
    </SwiftUIScreenShell>
  );
}
