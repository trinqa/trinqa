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

import { BalanceSummary } from '@/components/BalanceSummary';
import { CardLimitGauge } from '@/components/CardLimitGauge';
import { DateSectionDivider } from '@/components/DateSectionDivider';
import { InsetLayer } from '@/components/InsetLayer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SurfacePanel } from '@/components/SurfacePanel';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { WalletTransactionRow } from '@/components/WalletTransactionRow';
import { walletSummary, walletTransactions } from '@/data/mocks/wallet';
import { colors, componentTokens, screenTokens, typography } from '@/theme';

const GAUGE_WIDTH = 298;
const GAUGE_HEIGHT = 28;

export function WalletScreen() {
  const wallet = screenTokens.wallet;
  const transactionContentWidth =
    wallet.contentWidth - wallet.detailsHorizontalPadding * 2;
  const today = walletTransactions.filter((item) => item.group === 'today');
  const yesterday = walletTransactions.filter((item) => item.group === 'yesterday');

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader />
      </Group>

      <VStack modifiers={[padding({ top: wallet.headerToBalance })]}>
        <BalanceSummary
          totalLabel="Total Balance"
          totalValue={walletSummary.totalBalance}
          leftLabel="Available"
          leftValue={walletSummary.available}
          rightLabel="Earning"
          rightValue={walletSummary.earning}
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
                        progress={walletSummary.allocationProgress}
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
                      {walletSummary.earningAllocation}
                    </Text>
                  </HStack>
                </VStack>

                <Button
                  onPress={() => undefined}
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
                      Manage allocation
                    </Text>
                    <Spacer />
                    <Image systemName="arrow.right" size={14} color={colors.textPrimary} />
                  </HStack>
                </Button>
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

            <DateSectionDivider
              contentWidth={transactionContentWidth}
              label="Today"
              modifiers={[padding({ top: wallet.transactionTitleToGroup })]}
            />
            <VStack
              alignment="leading"
              spacing={wallet.transactionRowGap}
              modifiers={[padding({ top: componentTokens.dateSectionDivider.toRowsGap })]}
            >
              {today.map((item) => (
                <WalletTransactionRow key={item.id} item={item} />
              ))}
            </VStack>

            <DateSectionDivider
              contentWidth={transactionContentWidth}
              label="Yesterday"
              modifiers={[padding({ top: 12 })]}
            />
            <VStack
              alignment="leading"
              spacing={wallet.transactionRowGap}
              modifiers={[padding({ top: componentTokens.dateSectionDivider.toRowsGap })]}
            >
              {yesterday.map((item) => (
                <WalletTransactionRow key={item.id} item={item} />
              ))}
            </VStack>
          </VStack>
        </SurfacePanel>
      </VStack>
    </SwiftUIScreenShell>
  );
}
