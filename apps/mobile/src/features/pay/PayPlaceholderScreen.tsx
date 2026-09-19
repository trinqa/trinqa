import {
  Button,
  Group,
  HStack,
  Image,
  RNHostView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { BalanceSummary } from '@/components/BalanceSummary';
import { CardLimitGauge } from '@/components/CardLimitGauge';
import { DateSectionDivider } from '@/components/DateSectionDivider';
import { InsetLayer } from '@/components/InsetLayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SurfacePanel } from '@/components/SurfacePanel';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { WalletTransactionRow } from '@/components/WalletTransactionRow';
import { currencyCapability } from '@/data/capabilities';
import { formatLedgerMoney, toDisplayAmount } from '@/domain/money';
import { toWalletTransactionItem, transactionSection, walletTransactions } from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, typography } from '@/theme';

const GAUGE_WIDTH = 298;
const GAUGE_HEIGHT = 28;

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
        padding({ horizontal: 14 }),
        frame({ maxWidth: Infinity, height: 44 }),
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
      <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {label}
        </Text>
        <Spacer />
        <Image systemName={symbol} size={14} color={colors.textPrimary} />
      </HStack>
    </Button>
  );
}

export function WalletScreen() {
  const router = useRouter();
  const { account, balances, transactions } = useMockAppState();
  const wallet = screenTokens.wallet;
  const transactionContentWidth =
    wallet.contentWidth - wallet.detailsHorizontalPadding * 2;
  const walletTotal = balances.available + balances.earning;
  const allocationProgress = walletTotal > 0 ? balances.earning / walletTotal : 0;
  const capability = currencyCapability(account.displayCurrency);
  const walletRows = walletTransactions(transactions).map(toWalletTransactionItem);
  const sections = Array.from(
    new Map(
      walletTransactions(transactions).map((transaction) => {
        const section = transactionSection(transaction);
        return [section.id, section];
      }),
    ).values(),
  ).map((section) => ({
    ...section,
    items: walletRows.filter((item) => item.group === section.id),
  }));

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader />
      </Group>

      <VStack modifiers={[padding({ top: wallet.headerToBalance })]}>
        <BalanceSummary
          totalLabel="Total Balance"
          totalValue={formatBalance(toDisplayAmount(walletTotal, account))}
          currencySymbol={capability.symbol}
          leftLabel="Available"
          leftValue={formatBalance(toDisplayAmount(balances.available, account))}
          rightLabel="Earning"
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
                bottom: 28,
              }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            <Text
              modifiers={[
                font({ size: 17, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              Allocation
            </Text>

            <Group modifiers={[padding({ top: wallet.titleToLimitCard })]}>
              <InsetLayer>
                <VStack
                  alignment="leading"
                  spacing={0}
                  modifiers={[
                    padding({ horizontal: 14, vertical: 10 }),
                    frame({ maxWidth: Infinity, height: wallet.limitCardHeight }),
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
                  <Group modifiers={[frame({ width: GAUGE_WIDTH, height: GAUGE_HEIGHT })]}>
                    <RNHostView matchContents>
                      <CardLimitGauge
                        width={GAUGE_WIDTH}
                        height={GAUGE_HEIGHT}
                        progress={allocationProgress}
                      />
                    </RNHostView>
                  </Group>

                  <HStack spacing={8} modifiers={[padding({ top: 8 }), frame({ maxWidth: Infinity })]}>
                    <Text
                      modifiers={[
                        font({ size: 13, weight: 'medium' }),
                        foregroundStyle(colors.textSecondary),
                      ]}
                    >
                      Earning
                    </Text>
                    <Spacer />
                    <Text
                      modifiers={[
                        font({ size: 13, weight: 'semibold' }),
                        foregroundStyle(colors.textPrimary),
                      ]}
                    >
                      {`${formatLedgerMoney(balances.earning, account)}/${formatLedgerMoney(walletTotal, account)}`}
                    </Text>
                  </HStack>
                </VStack>

                <WalletActionRow
                  label="Manage allocation"
                  symbol="arrow.right"
                  onPress={() =>
                    router.push({ pathname: '/put-to-work', params: { origin: 'wallet' } })
                  }
                />
                <WalletActionRow
                  label="Withdraw"
                  symbol="arrow.down.to.line"
                  onPress={() => router.push('/withdraw')}
                />
              </InsetLayer>
            </Group>

            <Text
              modifiers={[
                padding({ top: wallet.transactionTopGap }),
                font({ size: 17, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              Transaction
            </Text>

            {sections.map((section, index) => (
              <VStack key={section.id} alignment="leading" spacing={componentTokens.dateSectionDivider.toRowsGap}>
                <DateSectionDivider
                  contentWidth={transactionContentWidth}
                  label={section.title}
                  modifiers={[padding({ top: index === 0 ? wallet.transactionTitleToGroup : 12 })]}
                />
                <VStack alignment="leading" spacing={wallet.transactionRowGap}>
                  {section.items.map((item) => (
                    <WalletTransactionRow key={item.id} item={item} />
                  ))}
                </VStack>
              </VStack>
            ))}
          </VStack>
        </SurfacePanel>
      </VStack>
    </SwiftUIScreenShell>
  );
}
