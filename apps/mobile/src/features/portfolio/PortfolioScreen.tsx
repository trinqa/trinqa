import { Button, DisclosureGroup, Group, HStack, Image, Popover, Spacer, Text, VStack } from '@expo/ui/swift-ui';
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
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

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
  getPortfolioSplit,
  portfolioChanges,
  lastEarnedAt,
  portfolioSince,
  resolveRiskProfile,
  totalEarned,
  type PortfolioNote,
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

/**
 * The one warm number on the page. The split below says where the money sits;
 * this says what it did, which is the part anyone actually wants to see, so it
 * rides beside the total rather than waiting three sections down.
 *
 * It explains itself in a popover instead of a permanent caption — a line of
 * small print under the balance would cost more attention than the figure earns.
 */
function GainBadge({
  value,
  isOpen,
  onToggle,
}: {
  value: string;
  isOpen: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Popover
      isPresented={isOpen}
      onIsPresentedChange={onToggle}
      arrowEdge="top"
    >
      <Popover.Trigger>
        <Button
          onPress={() => onToggle(true)}
          modifiers={[
            buttonStyle('plain'),
            ...hitTargetModifiers({
              label: `Earned ${value}`,
              hint: 'What your invested money has made.',
              minSize: true,
              shape: 'roundedRectangle',
              cornerRadius: componentTokens.surface.controlRadius,
              press: 'opacity',
            }),
          ]}
        >
          <HStack alignment="center" spacing={3}>
            <Image
              systemName="arrow.up.right"
              size={typography.footnote}
              color={colors.success}
            />
            <Text
              modifiers={[
                font({ size: typography.sectionTitle, weight: 'semibold' }),
                foregroundStyle(colors.success),
              ]}
            >
              {value}
            </Text>
          </HStack>
        </Button>
      </Popover.Trigger>

      <Popover.Content>
        <Group modifiers={[padding({ all: spacing.lg }), frame({ width: 232 })]}>
          <Text
            modifiers={[
              font({ size: typography.body, weight: 'medium' }),
              foregroundStyle(colors.textPrimary),
              // Without this the popover sizes to one line and clips the rest.
              fixedSize({ horizontal: false, vertical: true }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            Earned by your invested money. Already counted in the total.
          </Text>
        </Group>
      </Popover.Content>
    </Popover>
  );
}

/**
 * Trinqa's read on the portfolio, folded away behind one line. The notes were a
 * standing wall of text that pushed the history off the screen; as a disclosure
 * they are there for whoever wants them and invisible to everyone else. The
 * expansion is SwiftUI's own, so it animates without anything to hand-tune.
 */
function PortfolioRead({ notes, width }: { notes: PortfolioNote[]; width: number }) {
  const [isExpanded, setExpanded] = useState(false);

  return (
    <SurfacePanel width={width}>
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          padding({
            vertical: spacing.md,
            horizontal: homeTokens.recent.horizontalPadding,
          }),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        <DisclosureGroup
          isExpanded={isExpanded}
          onIsExpandedChange={setExpanded}
          modifiers={[tint(colors.action)]}
        >
          <DisclosureGroup.Label>
            <HStack alignment="center" spacing={spacing.sm}>
              <Image
                systemName="sparkles"
                size={typography.sectionTitle}
                color={colors.action}
              />
              <Text
                modifiers={[
                  font({ size: typography.kicker, weight: 'semibold' }),
                  foregroundStyle(colors.textPrimary),
                ]}
              >
                Trinqa's read
              </Text>
            </HStack>
          </DisclosureGroup.Label>

          <VStack
            alignment="leading"
            spacing={spacing.lg}
            modifiers={[padding({ top: spacing.md }), frame({ maxWidth: Infinity })]}
          >
            {notes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </VStack>
        </DisclosureGroup>
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

  const capability = currencyCapability(account.displayCurrency);
  const split = getPortfolioSplit(balances);
  const notes = getPortfolioNotes(split, strategy);
  const changes = portfolioChanges(transactions);
  const profile = resolveRiskProfile(strategy);
  const earned = totalEarned(transactions);
  const since = portfolioSince(transactions);
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

            <GainBadge
              value={formatLedgerMoney(earned, account)}
              isOpen={isGainOpen}
              onToggle={setGainOpen}
            />
          </HStack>

          <Group modifiers={[padding({ top: portfolio.valueToShareBar })]}>
            <SplitBar width={heroInner} growingShare={split.growingShare} />
          </Group>

          <Group modifiers={[padding({ top: portfolio.shareBarToTray })]}>
            <InsetLayer height={portfolio.splitTrayHeight}>
              <MetricTile
                label="Invested"
                symbol="lock.fill"
                trailingLabel={formatSharePercent(split.growingShare)}
                value={`${growingValue} ${capability.symbol}`}
                width={heroTrayFull}
              />
              <MetricTile
                label="Cash"
                symbol="banknote.fill"
                trailingLabel={formatSharePercent(split.readyShare)}
                value={`${readyValue} ${capability.symbol}`}
                width={heroTrayFull}
              />
            </InsetLayer>
          </Group>
        </VStack>
      </SurfacePanel>

      <PortfolioRead notes={notes} width={contentWidth} />

      <Section
        title="What it has made"
        width={contentWidth}
        caption={since ? `Since ${since}` : undefined}
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
            symbol="clock"
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
