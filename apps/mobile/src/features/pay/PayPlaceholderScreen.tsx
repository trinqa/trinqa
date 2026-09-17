import {
  Button,
  Divider,
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
  allowsTightening,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { BalanceSummary } from '@/components/BalanceSummary';
import { CardLimitGauge } from '@/components/CardLimitGauge';
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
          leftLabel="Payment Next"
          leftValue={walletSummary.paymentNext}
          rightLabel="Payment Completed"
          rightValue={walletSummary.paymentCompleted}
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
              Card Limits
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
                        progress={walletSummary.limitProgress}
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
                      Today Limits
                    </Text>
                    <Spacer />
                    <Text
                      modifiers={[
                        font({ size: 13, weight: 'semibold' }),
                        foregroundStyle(colors.textPrimary),
                      ]}
                    >
                      {walletSummary.todayLimit}
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
                      Set card limits
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

            <WalletDateGroup label="Today" modifiers={[padding({ top: wallet.transactionTitleToGroup })]} />
            <VStack alignment="leading" spacing={wallet.transactionRowGap} modifiers={[padding({ top: 10 })]}>
              {today.map((item) => (
                <WalletTransactionRow key={item.id} item={item} />
              ))}
            </VStack>

            <WalletDateGroup label="Yesterday" modifiers={[padding({ top: 12 })]} />
            <VStack alignment="leading" spacing={wallet.transactionRowGap} modifiers={[padding({ top: 10 })]}>
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

function WalletDateGroup({
  label,
  modifiers = [],
}: {
  label: string;
  modifiers?: import('@expo/ui/swift-ui/modifiers').ViewModifier[];
}) {
  return (
    <HStack alignment="center" spacing={0} modifiers={[frame({ maxWidth: Infinity }), ...modifiers]}>
      <Text
        modifiers={[
          frame({ width: 60, alignment: 'leading' }),
          lineLimit(1),
          allowsTightening(true),
          minimumScaleFactor(0.86),
          font({ size: 12, weight: 'medium' }),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Divider
        modifiers={[
          frame({ width: 274, height: 1 }),
          background(colors.action),
          opacity(0.65),
        ]}
      />
    </HStack>
  );
}
