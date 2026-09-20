import { Button, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { DeepScreenShell } from '@/components/DeepScreenShell';
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
import { currencyCapability } from '@/data/capabilities';
import { useMockAppState } from '@/state/mockAppState';
import {
  componentTokens,
  deepColors,
  screenTokens,
  spacing,
  typography,
} from '@/theme';

function DeepCard({
  children,
  width,
  padded = true,
}: {
  children: React.ReactNode;
  width: number;
  padded?: boolean;
}) {
  return (
    <VStack
      alignment="leading"
      spacing={spacing.md}
      modifiers={[
        ...(padded ? [padding({ all: screenTokens.portfolio.cardPadding })] : []),
        frame({ width, alignment: 'leading' }),
        background(
          deepColors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.panelRadius }),
        ),
        strokeBorder({
          content: deepColors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.panelRadius,
        }),
      ]}
    >
      {children}
    </VStack>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      modifiers={[
        font({ size: typography.kicker, weight: 'semibold' }),
        foregroundStyle(deepColors.textPrimary),
        frame({ maxWidth: Infinity, alignment: 'leading' }),
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * Where the money sits, as one bar rather than a pie. Two segments is the whole
 * story here, and a bar can be read at a glance without a legend.
 */
function SplitBar({
  width,
  growingShare,
}: {
  width: number;
  growingShare: number;
}) {
  const track = screenTokens.portfolio.shareBarHeight;
  const growingWidth = Math.max(0, Math.min(width, Math.round(width * growingShare)));

  return (
    <HStack
      spacing={2}
      modifiers={[frame({ width, height: track }), accessibilityLabel('Split between growing and ready to use')]}
    >
      <Group
        modifiers={[
          frame({ width: growingWidth, height: track }),
          background(deepColors.action, shapes.roundedRectangle({ cornerRadius: track / 2 })),
          clipShape('roundedRectangle', track / 2),
        ]}
      >
        <Spacer />
      </Group>
      <Group
        modifiers={[
          frame({ maxWidth: Infinity, height: track }),
          background(
            deepColors.track,
            shapes.roundedRectangle({ cornerRadius: track / 2 }),
          ),
          clipShape('roundedRectangle', track / 2),
        ]}
      >
        <Spacer />
      </Group>
    </HStack>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <Group
        modifiers={[frame({ width: 8, height: 8 }), background(color, shapes.circle())]}
      >
        <Spacer />
      </Group>
      <Text
        modifiers={[
          font({ size: typography.footnote, weight: 'medium' }),
          foregroundStyle(deepColors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: typography.footnote, weight: 'semibold' }),
          foregroundStyle(deepColors.textPrimary),
        ]}
      >
        {value}
      </Text>
    </HStack>
  );
}

function PillarTile({ pillar, width }: { pillar: PortfolioPillar; width: number }) {
  return (
    <VStack
      alignment="leading"
      spacing={componentTokens.metricCard.textGap}
      modifiers={[
        padding({ all: spacing.md }),
        frame({
          width,
          height: screenTokens.portfolio.pillarHeight,
          alignment: 'topLeading',
        }),
        background(
          deepColors.surfaceLayer,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
      ]}
    >
      <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Image systemName={pillar.symbol} size={typography.footnote} color={deepColors.textTertiary} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(deepColors.textSecondary),
          ]}
        >
          {pillar.label}
        </Text>
      </HStack>
      <Text
        modifiers={[
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(deepColors.textPrimary),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
        ]}
      >
        {pillar.value}
      </Text>
    </VStack>
  );
}

function NoteRow({ note }: { note: PortfolioNote }) {
  const tint = note.tone === 'positive' ? deepColors.success : deepColors.textSecondary;

  return (
    <HStack alignment="top" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <Image systemName={note.symbol} size={typography.sectionTitle} color={tint} />
      <VStack alignment="leading" spacing={componentTokens.transactionRow.textGap}>
        <Text
          modifiers={[
            font({ size: typography.label, weight: 'semibold' }),
            foregroundStyle(deepColors.textPrimary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {note.title}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(deepColors.textSecondary),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {note.body}
        </Text>
      </VStack>
    </HStack>
  );
}

function ChangeRow({
  title,
  subtitle,
  amount,
  symbol,
}: {
  title: string;
  subtitle: string;
  amount: string;
  symbol: SFSymbol;
}) {
  return (
    <HStack
      alignment="center"
      spacing={componentTokens.transactionRow.contentGap}
      modifiers={[frame({ maxWidth: Infinity, height: screenTokens.portfolio.changeRowHeight })]}
    >
      <Group
        modifiers={[
          frame({
            width: componentTokens.transactionRow.iconSize,
            height: componentTokens.transactionRow.iconSize,
          }),
          background(deepColors.surfaceLayer, shapes.circle()),
        ]}
      >
        <Image
          systemName={symbol}
          size={componentTokens.transactionRow.symbolSize}
          color={deepColors.textSecondary}
        />
      </Group>

      <VStack alignment="leading" spacing={componentTokens.transactionRow.textGap}>
        <Text
          modifiers={[
            font({ size: typography.label, weight: 'semibold' }),
            foregroundStyle(deepColors.textPrimary),
          ]}
        >
          {title}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(deepColors.textSecondary),
          ]}
        >
          {subtitle}
        </Text>
      </VStack>

      <Spacer />

      <Text
        modifiers={[
          font({ size: typography.label, weight: 'semibold' }),
          foregroundStyle(deepColors.textPrimary),
        ]}
      >
        {amount}
      </Text>
    </HStack>
  );
}

export function PortfolioScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { account, balances, strategy, transactions } = useMockAppState();

  const contentWidth = windowWidth - spacing.screenHorizontal * 2;
  const portfolio = screenTokens.portfolio;
  const innerWidth = contentWidth - portfolio.cardPadding * 2;
  const pillarWidth = Math.floor((innerWidth - portfolio.pillarGap) / 2);

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
    <DeepScreenShell sectionGap={portfolio.sectionGap} bottomPadding={spacing.scrollBottom}>
      <HStack
        alignment="center"
        spacing={componentTokens.headerControl.gap}
        modifiers={[frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size })]}
      >
        <Text
          modifiers={[
            font({ size: typography.pageTitle, weight: 'bold' }),
            foregroundStyle(deepColors.textPrimary),
          ]}
        >
          Portfolio
        </Text>

        <Spacer />

        <Button
          label="Back to Home"
          systemImage="chevron.down"
          onPress={() => router.back()}
          modifiers={[
            buttonStyle('plain'),
            labelStyle('iconOnly'),
            frame({
              width: componentTokens.headerControl.size,
              height: componentTokens.headerControl.size,
            }),
            background(deepColors.surface, shapes.circle()),
            strokeBorder({
              content: deepColors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'circle',
            }),
          ]}
        />
      </HStack>

      {/* Value and split: "where is my money". */}
      <DeepCard width={contentWidth}>
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(deepColors.textSecondary),
          ]}
        >
          Everything you have
        </Text>

        <HStack alignment="firstTextBaseline" spacing={componentTokens.layer.gap}>
          <Text
            modifiers={[
              font({ size: typography.amountHero, weight: 'bold' }),
              foregroundStyle(deepColors.textPrimary),
            ]}
          >
            {totalValue}
          </Text>
          <Text
            modifiers={[
              font({ size: typography.label, weight: 'medium' }),
              foregroundStyle(deepColors.textSecondary),
            ]}
          >
            {capability.symbol}
          </Text>
          <Spacer />
        </HStack>

        <SplitBar width={innerWidth} growingShare={split.growingShare} />

        <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
          <LegendDot
            color={deepColors.action}
            label={`Growing · ${formatSharePercent(split.growingShare)}`}
            value={`${growingValue} ${capability.symbol}`}
          />
          <LegendDot
            color={deepColors.track}
            label={`Ready to use · ${formatSharePercent(split.readyShare)}`}
            value={`${readyValue} ${capability.symbol}`}
          />
        </VStack>
      </DeepCard>

      {/* Strategy, risk, time horizon, liquidity — never in those words. */}
      <VStack alignment="leading" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity })]}>
        <SectionTitle>How it is being looked after</SectionTitle>
        <DeepCard width={contentWidth}>
          <HStack spacing={portfolio.pillarGap}>
            <PillarTile pillar={pillars[0]} width={pillarWidth} />
            <PillarTile pillar={pillars[1]} width={pillarWidth} />
          </HStack>
          <HStack spacing={portfolio.pillarGap}>
            <PillarTile pillar={pillars[2]} width={pillarWidth} />
            <PillarTile pillar={pillars[3]} width={pillarWidth} />
          </HStack>

          <Button
            onPress={() => router.push({ pathname: '/put-to-work', params: { origin: 'earn' } })}
            modifiers={[buttonStyle('plain'), accessibilityLabel('Change plan')]}
          >
            <HStack
              alignment="center"
              spacing={6}
              modifiers={[
                frame({ width: innerWidth, height: screenTokens.wallet.balanceActionHeight }),
                background(
                  deepColors.action,
                  shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
                ),
                clipShape('roundedRectangle', componentTokens.surface.cardRadius),
              ]}
            >
              <Text
                modifiers={[
                  font({ size: typography.footnote, weight: 'semibold' }),
                  foregroundStyle(deepColors.textPrimary),
                ]}
              >
                Change plan
              </Text>
            </HStack>
          </Button>
        </DeepCard>
      </VStack>

      {/* What we make of it. */}
      <VStack alignment="leading" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity })]}>
        <SectionTitle>What we make of it</SectionTitle>
        <DeepCard width={contentWidth}>
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </DeepCard>
      </VStack>

      {/* Earnings summary, pointing at Earn rather than repeating it. */}
      <VStack alignment="leading" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity })]}>
        <SectionTitle>What it has made</SectionTitle>
        <DeepCard width={contentWidth}>
          <HStack alignment="center" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity })]}>
            <VStack alignment="leading" spacing={componentTokens.transactionRow.textGap}>
              <Text
                modifiers={[
                  font({ size: typography.footnote, weight: 'medium' }),
                  foregroundStyle(deepColors.textSecondary),
                ]}
              >
                Earned so far
              </Text>
              <Text
                modifiers={[
                  font({ size: typography.amountDisplay, weight: 'bold' }),
                  foregroundStyle(deepColors.success),
                ]}
              >
                {formatLedgerMoney(earned, account)}
              </Text>
            </VStack>

            <Spacer />

            <VStack alignment="trailing" spacing={componentTokens.transactionRow.textGap}>
              <Text
                modifiers={[
                  font({ size: typography.footnote, weight: 'medium' }),
                  foregroundStyle(deepColors.textSecondary),
                ]}
              >
                Yearly return
              </Text>
              <Text
                modifiers={[
                  font({ size: typography.label, weight: 'semibold' }),
                  foregroundStyle(deepColors.textPrimary),
                ]}
              >
                {profile.estimatedApy.toFixed(1)}%
              </Text>
            </VStack>
          </HStack>
        </DeepCard>
      </VStack>

      {/* Only the movements that rearranged the portfolio. */}
      <VStack alignment="leading" spacing={spacing.md} modifiers={[frame({ maxWidth: Infinity })]}>
        <SectionTitle>What changed</SectionTitle>
        <DeepCard width={contentWidth}>
          {changes.length === 0 ? (
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'medium' }),
                foregroundStyle(deepColors.textSecondary),
                frame({ maxWidth: Infinity, alignment: 'leading' }),
              ]}
            >
              Nothing has moved between growing and ready to use yet.
            </Text>
          ) : (
            changes.map((change) => (
              <ChangeRow
                key={change.id}
                title={change.title}
                subtitle={change.subtitle}
                amount={`${formatAmountNumber(change.amount)} ${currencyCapability(change.currency).symbol}`}
                symbol={change.symbol ?? 'arrow.triangle.2.circlepath'}
              />
            ))
          )}
        </DeepCard>
      </VStack>
    </DeepScreenShell>
  );
}
