import { Button, Group, HStack, Image, Popover, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InsetLayer } from '@/components/InsetLayer';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { MetricTile } from '@/components/MetricTile';
import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { SurfacePanel } from '@/components/SurfacePanel';
import { ValueSummary } from '@/components/ValueSummary';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { currencyCapability } from '@/data/capabilities';
import { formatSharePercent } from '@/domain/balance';
import { formatAmountNumber, formatLedgerMoney, toDisplayAmount } from '@/domain/money';
import {
  getPortfolioRead,
  getPortfolioSplit,
  portfolioChanges,
  earnedWithin,
  lastEarnedAt,
  portfolioPeriods,
  resolvePeriod,
  resolveRiskProfile,
  totalEarned,
  type PortfolioPeriod,
} from '@/domain/portfolio';
import {
  transactionStatusColor,
  transactionStatusLabel,
  transactionStatusSymbol,
} from '@/domain/transactionPresentation';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, homeTokens, screenTokens, spacing, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

/**
 * A titled white panel. Same recipe as Home's Recent card, so the two screens
 * stack their sections identically instead of each inventing a container.
 */
function Section({
  title,
  width,
  caption,
  children,
}: {
  title: string;
  width: number;
  /** Right-aligned context for the title, e.g. the period a figure covers. */
  caption?: string;
  children: React.ReactNode;
}) {
  const recent = homeTokens.recent;

  return (
    <SurfacePanel width={width}>
      <VStack
        alignment="leading"
        spacing={recent.titleRowsGap}
        modifiers={[
          padding({
            top: recent.topPadding,
            bottom: recent.bottomPadding,
            horizontal: recent.horizontalPadding,
          }),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        <HStack alignment="firstTextBaseline" modifiers={[frame({ maxWidth: Infinity })]}>
          <Text
            modifiers={[
              font({ size: typography.kicker, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {title}
          </Text>
          <Spacer />
          {caption ? (
            <Text
              modifiers={[
                font({ size: typography.footnote, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {caption}
            </Text>
          ) : null}
        </HStack>
        {children}
      </VStack>
    </SurfacePanel>
  );
}

export function PortfolioScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { account, balances, strategy, transactions } = useMockAppState();

  const wallet = screenTokens.wallet;
  const portfolio = screenTokens.portfolio;
  const layer = componentTokens.layer;

  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  // The hero borrows Home's balance geometry; the sections borrow Recent's, which
  // is slightly narrower inside. Each tray is measured against its own panel so
  // nothing sits a couple of points off the column above it.
  const heroInner = contentWidth - wallet.balancePaddingHorizontal * 2;
  const heroTrayFull = heroInner - layer.inset * 2;
  const sectionInner = contentWidth - homeTokens.recent.horizontalPadding * 2;
  const sectionColumn = Math.floor((sectionInner - layer.inset * 2 - layer.gap) / 2);
  const sectionFull = sectionInner - layer.inset * 2;

  const [isGainOpen, setGainOpen] = useState(false);
  const [period, setPeriod] = useState<PortfolioPeriod>('1M');
  const [isReadOpen, setReadOpen] = useState(false);

  const capability = currencyCapability(account.displayCurrency);
  const split = getPortfolioSplit(balances);
  const read = getPortfolioRead(split, strategy);
  const changes = portfolioChanges(transactions);
  const profile = resolveRiskProfile(strategy);
  const earned = earnedWithin(transactions, period);
  const periodCaption = resolvePeriod(period).caption;
  const gain = earned > 0 ? `+${formatLedgerMoney(earned, account)}` : undefined;
  const gainInPeriod = gain ? `${gain} · ${period}` : undefined;
  const lastPaid = lastEarnedAt(transactions);

  const totalValue = formatAmountNumber(toDisplayAmount(split.total, account));
  const growingValue = formatAmountNumber(toDisplayAmount(split.growing, account));
  const readyValue = formatAmountNumber(toDisplayAmount(split.readyToUse, account));

  return (
    <SwiftUIScreenShell sectionGap={portfolio.sectionGap} bottomPadding={spacing.scrollBottom}>
      <HStack
        alignment="center"
        spacing={componentTokens.headerControl.gap}
        modifiers={[
          padding({ horizontal: spacing.headerTop }),
          frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.pageTitle, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Portfolio
        </Text>

        <Spacer />

        {/*
          Trinq's read, in a popover rather than a card. Two lines do not deserve a
          section of their own between the balance and its history.
        */}
        <Popover
          isPresented={isReadOpen}
          onIsPresentedChange={setReadOpen}
          arrowEdge="top"
        >
          <Popover.Trigger>
            <Button
              onPress={() => setReadOpen(true)}
              modifiers={[
                buttonStyle('plain'),
                ...hitTargetModifiers({
                  label: "Trinq's read",
                  hint: 'What Trinq makes of your portfolio.',
                  minSize: true,
                  shape: 'circle',
                  press: 'opacity',
                }),
                frame({
                  width: componentTokens.headerControl.size,
                  height: componentTokens.headerControl.size,
                }),
                background(colors.surface, shapes.circle()),
                strokeBorder({
                  content: colors.borderStrong,
                  style: { lineWidth: componentTokens.surface.borderWidth },
                  shape: 'circle',
                }),
              ]}
            >
              <Image
                systemName="sparkles"
                size={componentTokens.headerControl.symbolSize}
                color={colors.action}
              />
            </Button>
          </Popover.Trigger>

          <Popover.Content>
            <VStack
              alignment="leading"
              spacing={componentTokens.transactionRow.textGap}
              modifiers={[padding({ all: spacing.lg }), frame({ width: 246 })]}
            >
              <HStack alignment="center" spacing={5}>
                <Image
                  systemName="sparkles"
                  size={typography.footnote}
                  color={colors.action}
                />
                <Text
                  modifiers={[
                    font({ size: typography.fine, weight: 'semibold' }),
                    foregroundStyle(colors.action),
                  ]}
                >
                  Trinq
                </Text>
              </HStack>

              <Text
                modifiers={[
                  font({ size: typography.label, weight: 'semibold' }),
                  foregroundStyle(colors.textPrimary),
                  fixedSize({ horizontal: false, vertical: true }),
                  frame({ maxWidth: Infinity, alignment: 'leading' }),
                ]}
              >
                {read.headline}
              </Text>
              <Text
                modifiers={[
                  font({ size: typography.body, weight: 'medium' }),
                  foregroundStyle(colors.textSecondary),
                  fixedSize({ horizontal: false, vertical: true }),
                  frame({ maxWidth: Infinity, alignment: 'leading' }),
                ]}
              >
                {read.body}
              </Text>
            </VStack>
          </Popover.Content>
        </Popover>

        <HeaderIconButton
          label="Back to Home"
          symbol="chevron.down"
          onPress={() => router.back()}
        />
      </HStack>

      {/*
        Above the cards rather than inside one: it sets the window every figure on
        this page is measured over, so it cannot belong to any single card.
      */}
      <Group modifiers={[padding({ bottom: screenTokens.periodBar.toContent })]}>
        <NativeSegmentedControl
          accessibilityLabel="Period"
          value={period}
          onChange={setPeriod}
          options={portfolioPeriods}
          width={contentWidth}
          height={screenTokens.periodBar.height}
        />
      </Group>

      <ValueSummary
        width={contentWidth}
        label="Total value"
        totalValue={totalValue}
        currencySymbol={capability.symbol}
        gain={gain}
        gainPeriod={periodCaption}
        onGainPress={() => setGainOpen(true)}
        primary={{
          label: 'Invested',
          symbol: 'lock.fill',
          value: `${growingValue} ${capability.symbol}`,
          share: formatSharePercent(split.growingShare),
          delta: gainInPeriod,
        }}
        secondary={{
          label: 'Cash',
          symbol: 'creditcard.fill',
          value: `${readyValue} ${capability.symbol}`,
          share: formatSharePercent(split.readyShare),
        }}
      />

      <Section
        title="What it has made"
        width={contentWidth}
        caption={periodCaption}
      >
        {/*
          The running total moved up beside the balance, so repeating it here would
          be the same number twice on one screen. What this card can add instead is
          the rate it earns at and when it last paid.
        */}
        <InsetLayer axis="horizontal" height={portfolio.earningsTrayHeight}>
          <MetricTile
            label="Yearly return"
            value={`${profile.estimatedApy.toFixed(1)}%`}
            width={sectionColumn}
          />
          <MetricTile
            label="Last paid"
            value={lastPaid ?? '—'}
            width={sectionColumn}
          />
        </InsetLayer>
      </Section>

      <Section title="What changed" width={contentWidth}>
        <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
          {changes.length === 0 ? (
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
                frame({ maxWidth: Infinity, alignment: 'leading' }),
              ]}
            >
              Nothing has moved between growing and ready to use yet.
            </Text>
          ) : (
            changes.map((change) => (
              <LayeredTransactionRow
                key={change.id}
                title={change.title}
                subtitle={change.subtitle}
                amount={`${formatAmountNumber(change.amount)} ${currencyCapability(change.currency).symbol}`}
                meta={new Date(change.occurredAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                symbol={change.symbol ?? 'arrow.triangle.2.circlepath'}
                footerLeadingText={transactionStatusLabel(change.status)}
                footerSymbol={transactionStatusSymbol(change.status)}
                footerLeadingColor={transactionStatusColor(change.status)}
                footerTrailingText="Details"
                onFooterPress={() =>
                  router.push({ pathname: '/activity', params: { transactionId: change.id } })
                }
                onPress={() =>
                  router.push({ pathname: '/activity', params: { transactionId: change.id } })
                }
              />
            ))
          )}
        </VStack>
      </Section>
    </SwiftUIScreenShell>
  );
}
