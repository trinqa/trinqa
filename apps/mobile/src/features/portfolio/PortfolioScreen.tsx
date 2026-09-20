import { Button, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InsetLayer } from '@/components/InsetLayer';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { MetricTile } from '@/components/MetricTile';
import { SurfacePanel } from '@/components/SurfacePanel';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { currencyCapability } from '@/data/capabilities';
import { formatSharePercent } from '@/domain/balance';
import { formatAmountNumber, formatLedgerMoney, toDisplayAmount } from '@/domain/money';
import {
  getPortfolioNotes,
  getPortfolioPillars,
  getPortfolioSplit,
  portfolioChanges,
  resolveRiskProfile,
  totalEarned,
  type PortfolioNote,
  type PortfolioPillar,
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
  children,
}: {
  title: string;
  width: number;
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
        <Text
          modifiers={[
            font({ size: typography.kicker, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {title}
        </Text>
        {children}
      </VStack>
    </SurfacePanel>
  );
}

/** Where the money sits, as one bar. Two segments need no legend of their own. */
function SplitBar({ width, growingShare }: { width: number; growingShare: number }) {
  const track = screenTokens.portfolio.shareBarHeight;
  const radius = track / 2;
  const growingWidth = Math.max(0, Math.min(width, Math.round(width * growingShare)));

  return (
    <HStack
      spacing={2}
      modifiers={[
        frame({ width, height: track }),
        accessibilityLabel(`${formatSharePercent(growingShare)} growing, the rest ready to use`),
      ]}
    >
      <Group
        modifiers={[
          frame({ width: growingWidth, height: track }),
          background(colors.action, shapes.roundedRectangle({ cornerRadius: radius })),
          clipShape('roundedRectangle', radius),
        ]}
      >
        <Spacer />
      </Group>
      <Group
        modifiers={[
          frame({ maxWidth: Infinity, height: track }),
          background(colors.surfaceLayer, shapes.roundedRectangle({ cornerRadius: radius })),
          clipShape('roundedRectangle', radius),
          strokeBorder({
            content: colors.borderStrong,
            style: { lineWidth: componentTokens.surface.borderWidth },
            shape: 'roundedRectangle' as const,
            cornerRadius: radius,
          }),
        ]}
      >
        <Spacer />
      </Group>
    </HStack>
  );
}

function PillarTile({ pillar, width }: { pillar: PortfolioPillar; width: number }) {
  return (
    <VStack
      alignment="leading"
      spacing={componentTokens.metricCard.textGap}
      modifiers={[
        padding({ horizontal: componentTokens.transactionRow.horizontalPadding }),
        frame({
          width,
          height: screenTokens.wallet.metricTileHeight,
          alignment: 'leading',
        }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
      ]}
    >
      <HStack alignment="center" spacing={5}>
        <Image systemName={pillar.symbol} size={typography.fine} color={colors.textSecondary} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {pillar.label}
        </Text>
        <Spacer />
      </HStack>

      <Text
        modifiers={[
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {pillar.value}
      </Text>
    </VStack>
  );
}

/**
 * A white tile in the tray, like the ones above it, with the accent carried by the
 * label rather than a fill. Portfolio is a screen for reading: a full-width blue
 * slab here out-shouted the balance it was meant to explain. The one filled accent
 * on this page is the split bar, which is data.
 */
function TrayAction({
  label,
  symbol,
  width,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  width: number;
  onPress: () => void;
}) {
  const radius = componentTokens.surface.cardRadius;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label,
          shape: 'roundedRectangle',
          cornerRadius: radius,
          press: 'full',
        }),
      ]}
    >
      <HStack
        alignment="center"
        spacing={6}
        modifiers={[
          padding({ horizontal: componentTokens.transactionRow.horizontalPadding }),
          frame({ width, height: screenTokens.wallet.balanceActionHeight }),
          background(colors.surface, shapes.roundedRectangle({ cornerRadius: radius })),
          clipShape('roundedRectangle', radius),
        ]}
      >
        <Image systemName={symbol} size={typography.caption} color={colors.action} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'semibold' }),
            foregroundStyle(colors.action),
          ]}
        >
          {label}
        </Text>
        <Spacer />
        <Image systemName="chevron.right" size={typography.fine} color={colors.textSecondary} />
      </HStack>
    </Button>
  );
}

function NoteRow({ note }: { note: PortfolioNote }) {
  const tint = note.tone === 'positive' ? colors.success : colors.textSecondary;

  return (
    <HStack
      alignment="top"
      spacing={componentTokens.transactionRow.contentGap}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      <Image systemName={note.symbol} size={typography.sectionTitle} color={tint} />
      <VStack alignment="leading" spacing={componentTokens.transactionRow.textGap}>
        <Text
          modifiers={[
            font({ size: typography.label, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {note.title}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {note.body}
        </Text>
      </VStack>
    </HStack>
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

  const capability = currencyCapability(account.displayCurrency);
  const split = getPortfolioSplit(balances);
  const pillars = getPortfolioPillars(strategy);
  const notes = getPortfolioNotes(split, strategy);
  const changes = portfolioChanges(transactions);
  const profile = resolveRiskProfile(strategy);
  const earned = totalEarned(transactions);

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

        <HeaderIconButton
          label="Back to Home"
          symbol="chevron.down"
          onPress={() => router.back()}
        />
      </HStack>

      {/* The same panel Home opens with, answering "where is it" instead of "how much". */}
      <SurfacePanel
        width={contentWidth}
        height={portfolio.heroHeight}
        cornerRadius={componentTokens.surface.panelRadius}
      >
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[
            padding({
              top: wallet.balancePaddingTop,
              horizontal: wallet.balancePaddingHorizontal,
            }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.footnote, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            Everything you have
          </Text>

          <HStack
            alignment="firstTextBaseline"
            spacing={layer.gap}
            modifiers={[
              padding({ top: wallet.balanceTitleToValue }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            <Text
              modifiers={[
                font({ size: typography.amountCurrency, weight: 'bold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {totalValue}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.label, weight: 'medium' }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              {capability.symbol}
            </Text>
            <Spacer />
          </HStack>

          <Group modifiers={[padding({ top: portfolio.valueToShareBar })]}>
            <SplitBar width={heroInner} growingShare={split.growingShare} />
          </Group>

          <Group modifiers={[padding({ top: portfolio.shareBarToTray })]}>
            <InsetLayer height={portfolio.splitTrayHeight}>
              <MetricTile
                label="Growing"
                trailingLabel={formatSharePercent(split.growingShare)}
                value={`${growingValue} ${capability.symbol}`}
                width={heroTrayFull}
              />
              <MetricTile
                label="Ready to use"
                trailingLabel={formatSharePercent(split.readyShare)}
                value={`${readyValue} ${capability.symbol}`}
                width={heroTrayFull}
              />
            </InsetLayer>
          </Group>
        </VStack>
      </SurfacePanel>

      {/* Strategy, risk, horizon and liquidity — none of them named that way. */}
      <Section title="How it is being looked after" width={contentWidth}>
        <InsetLayer height={portfolio.pillarTrayHeight}>
          <HStack alignment="center" spacing={layer.gap}>
            <PillarTile pillar={pillars[0]} width={sectionColumn} />
            <PillarTile pillar={pillars[1]} width={sectionColumn} />
          </HStack>
          <HStack alignment="center" spacing={layer.gap}>
            <PillarTile pillar={pillars[2]} width={sectionColumn} />
            <PillarTile pillar={pillars[3]} width={sectionColumn} />
          </HStack>
          <TrayAction
            label="Change plan"
            symbol="slider.horizontal.3"
            width={sectionFull}
            onPress={() => router.push({ pathname: '/put-to-work', params: { origin: 'earn' } })}
          />
        </InsetLayer>
      </Section>

      <Section title="What we make of it" width={contentWidth}>
        <VStack alignment="leading" spacing={spacing.lg}>
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </VStack>
      </Section>

      <Section title="What it has made" width={contentWidth}>
        <InsetLayer axis="horizontal" height={portfolio.earningsTrayHeight}>
          <MetricTile
            label="Earned so far"
            value={formatLedgerMoney(earned, account)}
            width={sectionColumn}
            valueColor={colors.success}
          />
          <MetricTile
            label="Yearly return"
            value={`${profile.estimatedApy.toFixed(1)}%`}
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
