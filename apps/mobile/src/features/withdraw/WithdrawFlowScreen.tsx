import { useEffect, useMemo, useState } from 'react';

import {
  BottomSheet,
  Button,
  Divider,
  Group,
  HStack,
  Image,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  shapes,
  strokeBorder,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { FlowAmountEntry } from '@/components/FlowAmountEntry';
import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  FlowProcessingState,
  FlowStepLayout,
  FlowSuccessState,
  PrimaryActionButton,
  type FlowProcessingRowState,
} from '@/components/FlowControls';
import { FlowCurrencyMenu } from '@/components/FlowCurrencyMenu';
import { FlowInlineState } from '@/components/FlowStates';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  quickWithdrawalAmounts,
  withdrawalCurrencies,
  withdrawalDestinations,
} from '@/data/mocks/withdraw';
import { liveCurrenciesFor, payoutBlockedReason } from '@/data/capabilities';
import { errorMessage } from '@/services/apiErrors';
import { executeWithdrawTry, quoteWithdrawTry, type WithdrawLiveQuote } from '@/services/flows';
import type { QuoteRouteDecision, RouteAdvisorInfo, RouteRejectReason } from '@/services/types';
import { useLiveQuote, type LiveQuoteState } from '@/services/useLiveQuote';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import { cardChromeModifiers } from '@/theme/swiftUi';
import type {
  WithdrawalCurrency,
  WithdrawalDestination,
  WithdrawalIntent,
  WithdrawalQuote,
  WithdrawalStatus,
  WithdrawalStep,
} from '@/types';

const CURRENCY_SYMBOLS: Record<WithdrawalCurrency, string> = {
  TRY: '₺',
  EUR: '€',
  USD: '$',
  BRL: 'R$',
};

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPayoutAmount(
  value: number,
  currency: WithdrawalCurrency,
  decimals = true,
) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })} ${CURRENCY_SYMBOLS[currency]}`;
}

// Balances, debits and fees are USDC, presented as USD across the app.
function formatUsd(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} $`;
}

function formatUsdRate(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} $`;
}

/** One short clause per reason the route planner can emit, written for people who don't know SEPs. */
const ROUTE_REJECT_REASONS: Record<RouteRejectReason, string> = {
  CURRENCY_UNSUPPORTED: 'does not pay out in this currency',
  DIRECTION_UNSUPPORTED: 'does not support withdrawals',
  BELOW_MIN: 'needs a larger amount',
  ABOVE_MAX: 'caps payouts below this amount',
  SEP_MISSING: 'does not support the connection we need',
  UNAVAILABLE: 'is not available for payouts',
  KYC_REQUIRED: 'needs identity checks to be completed first',
  NOT_EXECUTABLE: 'is not ready to complete a payout',
};

const ADVISOR_FALLBACK_REASONS = [
  'disabled',
  'timeout',
  'error',
  'low_confidence',
  'invalid_output',
  'no_routes',
] as const;

function isAdvisorFallbackReason(value: unknown): value is NonNullable<RouteAdvisorInfo['fallbackReason']> {
  return ADVISOR_FALLBACK_REASONS.some((reason) => reason === value);
}

/**
 * `providerPayload` is free-form, so the decision is validated before anything is shown.
 * A malformed row drops the whole decision — a partial list would misreport how many routes
 * were considered. Reason codes are the exception: an unknown one is skipped when the reasons
 * are written out, because the entry still counts even when we cannot phrase it.
 */
function parseRouteDecision(payload: Record<string, unknown> | undefined): QuoteRouteDecision | null {
  const raw = payload?.routeDecision;
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const advisor = value.advisor;
  if (typeof value.executedVia !== 'string' || !value.executedVia) return null;
  if (!advisor || typeof advisor !== 'object') return null;
  const advisorValue = advisor as Record<string, unknown>;
  if (advisorValue.name !== 'jev' && advisorValue.name !== 'none') return null;
  if (typeof advisorValue.used !== 'boolean' || typeof advisorValue.minConfidence !== 'number') return null;
  if (!Array.isArray(value.eligible) || !Array.isArray(value.rejected)) return null;

  const eligible: QuoteRouteDecision['eligible'] = [];
  for (const item of value.eligible) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.routeId !== 'string' || typeof row.score !== 'number') return null;
    eligible.push({ routeId: row.routeId, score: row.score });
  }

  const rejected: QuoteRouteDecision['rejected'] = [];
  for (const item of value.rejected) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    if (typeof row.anchorId !== 'string' || !Array.isArray(row.reasons)) return null;
    if (row.reasons.some((reason) => typeof reason !== 'string')) return null;
    const reasons = row.reasons.filter(
      (reason): reason is RouteRejectReason => reason in ROUTE_REJECT_REASONS,
    );
    rejected.push({ anchorId: row.anchorId, reasons });
  }

  return {
    chosenRouteId: typeof value.chosenRouteId === 'string' ? value.chosenRouteId : null,
    chosenAnchor: typeof value.chosenAnchor === 'string' ? value.chosenAnchor : null,
    executable: value.executable === true,
    executedVia: value.executedVia,
    advisor: {
      name: advisorValue.name,
      used: advisorValue.used,
      minConfidence: advisorValue.minConfidence,
      ...(isAdvisorFallbackReason(advisorValue.fallbackReason)
        ? { fallbackReason: advisorValue.fallbackReason }
        : {}),
    },
    eligible,
    rejected,
  };
}

/**
 * Describes the real decision. Two claims only: how many options were looked at, and who was
 * picked — the count covers rejected anchors too, which are never scored, so it stays separate
 * from the pick. The payout always leaves through `executedVia`, whatever ranked highest.
 */
function routeDecisionSubtitle(decision: QuoteRouteDecision) {
  const considered = decision.eligible.length + decision.rejected.length;
  // The notice box is a fixed height, so every variant stays close to the copy it replaced.
  const checked = `${considered} ${considered === 1 ? 'option' : 'options'} checked.`;
  const chosen = decision.chosenAnchor;
  if (!chosen) return `${checked} ${decision.executedVia} pays you out.`;
  // Jev is only named when it actually fed the scores; otherwise the pick was computed here.
  const pick = decision.advisor.used ? `Jev helped pick ${chosen}` : `We picked ${chosen}`;
  if (chosen === decision.executedVia) return `${checked} ${pick}, which pays you out.`;
  return `${checked} ${pick}, but ${decision.executedVia} pays out.`;
}

/**
 * Only reached with a decision from an earlier, successful quote, so anything the amount changes
 * (BELOW_MIN, ABOVE_MAX) is dropped — it would describe a different amount than the one that failed.
 */
function ruledOutSubtitle(decision: QuoteRouteDecision) {
  const lines = decision.rejected
    .map((entry) => {
      const reasons = entry.reasons.filter((reason) => reason !== 'BELOW_MIN' && reason !== 'ABOVE_MAX');
      if (reasons.length === 0) return null;
      return `${entry.anchorId} ${reasons.map((reason) => ROUTE_REJECT_REASONS[reason]).join(', ')}.`;
    })
    .filter((line): line is string => line !== null);
  return lines.length > 0 ? lines.join('\n') : null;
}

/** Maps the BFF cash-out quote onto the review model. Without a live quote nothing is claimable. */
function toWithdrawalQuote(
  intent: WithdrawalIntent,
  available: number,
  live: WithdrawLiveQuote | null,
): WithdrawalQuote {
  if (!live) {
    return {
      receiveAmount: intent.amount,
      receiveCurrency: intent.payoutCurrency,
      debitAmount: 0,
      debitCurrency: 'USD',
      fee: 0,
      exchangeRate: 0,
      estimatedArrival: '—',
      availableAmount: available,
      availableDebitAmount: 0,
      requiresEarnUnwind: false,
      earnUnwindAmount: 0,
      routeId: 'tr-mock-anchor',
      routeDecision: null,
      hasSufficientTotal: false,
    };
  }
  const { quote } = live;
  const receiveAmount = Number(quote.receiveAmount);
  const debitAmount = Number(quote.debitAmount);
  return {
    receiveAmount,
    receiveCurrency: intent.payoutCurrency,
    debitAmount,
    debitCurrency: 'USD',
    fee: Number(quote.fee.amount),
    exchangeRate: receiveAmount > 0 ? debitAmount / receiveAmount : 0,
    estimatedArrival: `~${quote.estimatedArrivalMinutes} min`,
    availableAmount: available,
    availableDebitAmount: Number(quote.funding?.availableContribution ?? debitAmount),
    requiresEarnUnwind: Boolean(quote.funding?.requiresEarnUnwind),
    earnUnwindAmount: Number(quote.funding?.earnContribution ?? 0),
    routeId: quote.routeType,
    routeDecision: parseRouteDecision(quote.providerPayload),
    hasSufficientTotal: true,
  };
}

function processingRowState(
  status: WithdrawalStatus,
  rowStatus: Exclude<WithdrawalStatus, 'failed'>,
  requiresEarnUnwind: boolean,
): FlowProcessingRowState {
  if (status === 'failed') return 'pending';
  const order: Exclude<WithdrawalStatus, 'failed'>[] = requiresEarnUnwind
    ? ['initiated', 'unwinding', 'converting', 'sending', 'completed']
    : ['initiated', 'converting', 'sending', 'completed'];
  const currentIndex = order.indexOf(status);
  const rowIndex = order.indexOf(rowStatus);
  if (rowIndex < currentIndex) return 'complete';
  if (rowIndex === currentIndex) return 'current';
  return 'pending';
}

function DestinationRow({
  destination,
  onPress,
}: {
  destination: WithdrawalDestination;
  onPress: () => void;
}) {
  const row = componentTokens.selectionRow;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`${destination.name}, ${destination.detail}`),
        frame({ width: screenTokens.withdrawalFlow.contentWidth, height: row.height }),
        ...cardChromeModifiers(row.radius),
      ]}
    >
      <HStack
        alignment="center"
        spacing={row.contentGap}
        modifiers={[
          padding({ horizontal: row.horizontalPadding }),
          frame({ width: screenTokens.withdrawalFlow.contentWidth, height: row.height }),
        ]}
      >
        <ZStack
          modifiers={[
            frame({ width: row.iconSize, height: row.iconSize }),
            background(colors.surfaceLayer, shapes.circle()),
          ]}
        >
          <Image systemName={destination.symbol} size={row.symbolSize} color={colors.textPrimary} />
        </ZStack>
        <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text
            modifiers={[
              font({ size: typography.body, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {destination.name}
          </Text>
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {destination.detail}
          </Text>
        </VStack>
        <Spacer />
        <Image systemName="chevron.right" size={12} color={colors.textSecondary} />
      </HStack>
    </Button>
  );
}

function NewBankAccountSheet({
  onSelect,
}: {
  onSelect: (destination: WithdrawalDestination) => void;
}) {
  const [isPresented, setIsPresented] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<WithdrawalDestination | null>(null);
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const accountHolderText = useNativeState('');
  const ibanText = useNativeState('');
  const flow = screenTokens.withdrawalFlow;

  const saveDestination = () => {
    const lastFour = iban.replace(/\s/g, '').slice(-4) || '0000';
    setPendingDestination({
      id: `bank-${lastFour}`,
      name: accountHolder.trim() || 'Bank account',
      detail: `•••• ${lastFour}`,
      kind: 'bank',
      symbol: 'building.columns.fill',
    });
    setIsPresented(false);
  };

  const handleDismiss = () => {
    if (!pendingDestination) return;
    onSelect(pendingDestination);
    setPendingDestination(null);
  };

  const fieldModifiers = [
    textFieldStyle('plain'),
    padding({ horizontal: 12 }),
    frame({ width: flow.contentWidth, height: flow.fieldHeight }),
    background(
      colors.surfaceLayer,
      shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
    ),
    clipShape('roundedRectangle', componentTokens.surface.controlRadius),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'roundedRectangle' as const,
      cornerRadius: componentTokens.surface.controlRadius,
    }),
  ];

  return (
    <BottomSheet
      isPresented={isPresented}
      onIsPresentedChange={setIsPresented}
      onDismiss={handleDismiss}
      anchor={
        <Button
          label="Add new bank account"
          systemImage="plus.circle"
          onPress={() => setIsPresented(true)}
          modifiers={[
            buttonStyle('plain'),
            accessibilityLabel('Add new bank account'),
            frame({ width: flow.contentWidth, height: componentTokens.headerControl.size }),
            background(
              colors.surface,
              shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
            ),
            clipShape('roundedRectangle', componentTokens.surface.controlRadius),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'roundedRectangle',
              cornerRadius: componentTokens.surface.controlRadius,
            }),
          ]}
        />
      }
    >
      <Group
        modifiers={[
          presentationDetents([{ height: flow.sheetHeight }]),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        <VStack alignment="leading" spacing={12} modifiers={[padding({ top: 18, bottom: 14, horizontal: 18 })]}>
          <VStack alignment="leading" spacing={4}>
            <Text
              modifiers={[
                font({ size: typography.sectionTitle, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              Add bank account
            </Text>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
              Add the destination for this withdrawal.
            </Text>
          </VStack>
          <TextField
            text={accountHolderText}
            placeholder="Account holder"
            onTextChange={(value) => setAccountHolder(value)}
            modifiers={fieldModifiers}
          />
          <TextField
            text={ibanText}
            placeholder="IBAN"
            onTextChange={(value) => setIban(value)}
            modifiers={[keyboardType('ascii-capable'), ...fieldModifiers]}
          />
          <PrimaryActionButton
            label="Save and continue"
            onPress={saveDestination}
            isDisabled={!accountHolder.trim() || iban.replace(/\s/g, '').length < 8}
          />
        </VStack>
      </Group>
    </BottomSheet>
  );
}

function DestinationStep({
  onBack,
  onSelectDestination,
}: {
  onBack: () => void;
  onSelectDestination: (destination: WithdrawalDestination) => void;
}) {
  const flow = screenTokens.withdrawalFlow;
  const bankDestination = withdrawalDestinations[0];
  const walletDestination = withdrawalDestinations[1];

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: flow.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader showBack title="Where should we send it?" onBackPress={onBack} />
      </Group>

      <VStack alignment="leading" spacing={0} modifiers={[padding({ top: flow.destinationTopGap })]}>
        <Text
          modifiers={[
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Bank account
        </Text>
        <VStack spacing={flow.destinationRowGap} modifiers={[padding({ top: 8 })]}>
          <DestinationRow destination={bankDestination} onPress={() => onSelectDestination(bankDestination)} />
          <NewBankAccountSheet onSelect={onSelectDestination} />
        </VStack>

        <Text
          modifiers={[
            padding({ top: flow.destinationSectionGap }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Other destination
        </Text>
        <Group modifiers={[padding({ top: 8 })]}>
          <DestinationRow
            destination={walletDestination}
            onPress={() => onSelectDestination(walletDestination)}
          />
        </Group>
      </VStack>
      <Spacer />
    </VStack>
  );
}

function WithdrawalAmountSummary({
  intent,
  quote,
  quoteState,
  ruledOut,
}: {
  intent: WithdrawalIntent;
  quote: WithdrawalQuote;
  quoteState: LiveQuoteState<WithdrawLiveQuote>;
  ruledOut: string | null;
}) {
  const ready = Boolean(quoteState.data);
  return (
    <VStack spacing={8}>
      <FlowCard height={screenTokens.withdrawalFlow.summaryHeight}>
        <VStack
          alignment="leading"
          spacing={7}
          modifiers={[
            padding({ horizontal: screenTokens.paymentFlow.cardPadding, vertical: 11 }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            You’ll receive
          </Text>
          <Text
            modifiers={[
              font({ size: typography.sectionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {formatPayoutAmount(intent.amount, intent.payoutCurrency)}
          </Text>
          <Divider />
          <FlowInfoRow
            label="Estimated debit"
            value={ready ? formatUsd(quote.debitAmount) : quoteState.loading ? 'Getting a live quote…' : '—'}
          />
          <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
            <FlowInfoRow label="Fee" value={ready ? formatUsd(quote.fee) : '—'} />
            <FlowInfoRow label="Arrival" value={quote.estimatedArrival} />
          </HStack>
          <FlowInfoRow
            label="Exchange rate"
            value={ready ? `1 ${CURRENCY_SYMBOLS[intent.payoutCurrency]} ≈ ${formatUsdRate(quote.exchangeRate)}` : '—'}
          />
        </VStack>
      </FlowCard>

      {quote.requiresEarnUnwind && quote.hasSufficientTotal ? (
        <FlowNotice
          symbol="arrow.uturn.backward.circle"
          title="Part of this amount is currently earning"
          subtitle={`Needed from Earn ${formatUsd(quote.earnUnwindAmount)}`}
        />
      ) : null}
      {quoteState.error ? (
        <FlowInlineState symbol="exclamationmark.circle" title="Can’t withdraw this amount" subtitle={quoteState.error} />
      ) : null}
      {quoteState.error && ruledOut ? (
        <FlowInlineState symbol="xmark.circle" title="Payout options already ruled out" subtitle={ruledOut} />
      ) : null}
    </VStack>
  );
}

function ReviewStep({
  destination,
  intent,
  onBack,
  onConfirm,
  quote,
  error,
}: {
  destination: WithdrawalDestination;
  intent: WithdrawalIntent;
  onBack: () => void;
  onConfirm: () => void;
  quote: WithdrawalQuote;
  error?: string | null;
}) {
  const receiveAmount = formatPayoutAmount(intent.amount, intent.payoutCurrency);

  return (
    <FlowStepLayout
      title="Review"
      onBack={onBack}
      primaryLabel="Confirm"
      onPrimaryPress={onConfirm}
      isPrimaryDisabled={!quote.hasSufficientTotal}
    >
      <VStack alignment="leading" spacing={screenTokens.paymentFlow.cardGap} modifiers={[padding({ top: spacing.xxxl })]}>
        <FlowCard>
          <VStack alignment="leading" spacing={11} modifiers={[padding({ all: screenTokens.paymentFlow.cardPadding })]}>
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  You’re withdrawing
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {receiveAmount}
                </Text>
              </VStack>
              <Spacer />
              <ZStack modifiers={[frame({ width: 36, height: 36 }), background(colors.surfaceLayer, shapes.circle())]}>
                <Image systemName="arrow.down.to.line" size={16} color={colors.action} />
              </ZStack>
            </HStack>

            <Divider />
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>To</Text>
              <Spacer />
              <VStack alignment="trailing" spacing={2}>
                <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                  {destination.name}
                </Text>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  {destination.detail}
                </Text>
              </VStack>
            </HStack>
            <Divider />
            <FlowInfoRow label="You’ll receive" value={receiveAmount} />
            <FlowInfoRow label="Total deducted" value={formatUsd(quote.debitAmount)} />
            <FlowInfoRow label="Fee" value={formatUsd(quote.fee)} />
            <FlowInfoRow label="Estimated arrival" value={quote.estimatedArrival} />
            <FlowInfoRow
              label="Exchange rate"
              value={`1 ${CURRENCY_SYMBOLS[intent.payoutCurrency]} ≈ ${formatUsdRate(quote.exchangeRate)}`}
            />

            {quote.requiresEarnUnwind ? (
              <VStack alignment="leading" spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                <Divider />
                <FlowInfoRow label="From available" value={formatUsd(quote.availableDebitAmount)} />
                <FlowInfoRow label="From Earn" value={formatUsd(quote.earnUnwindAmount)} />
              </VStack>
            ) : null}
          </VStack>
        </FlowCard>

        {quote.routeDecision ? (
          <FlowNotice
            symbol="point.3.connected.trianglepath.dotted"
            title="Payout route"
            subtitle={routeDecisionSubtitle(quote.routeDecision)}
          />
        ) : null}
        {error ? (
          <FlowInlineState symbol="exclamationmark.circle" title="Withdrawal failed" subtitle={error} />
        ) : null}
      </VStack>
    </FlowStepLayout>
  );
}

export function WithdrawFlowScreen() {
  const router = useRouter();
  const { account, balances, capabilities } = useMockAppState();
  const [step, setStep] = useState<WithdrawalStep>('amount');
  const [currency, setCurrency] = useState<WithdrawalCurrency>('TRY');
  const [amount, setAmount] = useState(1);
  const [destination, setDestination] = useState<WithdrawalDestination>(withdrawalDestinations[0]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus>('initiated');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const amountText = useNativeState(formatWholeAmount(1));
  const currencies = liveCurrenciesFor('withdraw', capabilities);
  const withdrawOptions = currencies.length ? currencies : withdrawalCurrencies;

  const intent = useMemo<WithdrawalIntent>(
    () => ({ amount, payoutCurrency: currency, destinationId: destination.id }),
    [amount, currency, destination.id],
  );
  const blocked = payoutBlockedReason(currency, capabilities);
  const liveQuote = useLiveQuote(
    `${account.id}:${currency}:${amount}`,
    amount > 0 && !blocked,
    () => quoteWithdrawTry({ accountId: account.id, tryAmount: amount, currency }),
  );
  const quote = useMemo(
    () => toWithdrawalQuote(intent, balances.available, liveQuote.data),
    [balances.available, intent, liveQuote.data],
  );
  // A failed quote carries no decision, so the last one is kept to explain what was already ruled out.
  const [lastDecision, setLastDecision] = useState<
    { currency: WithdrawalCurrency; decision: QuoteRouteDecision } | null
  >(null);
  useEffect(() => {
    if (quote.routeDecision) setLastDecision({ currency, decision: quote.routeDecision });
  }, [currency, quote.routeDecision]);
  const ruledOut = useMemo(
    () => (lastDecision?.currency === currency ? ruledOutSubtitle(lastDecision.decision) : null),
    [currency, lastDecision],
  );

  const receiveAmount = formatPayoutAmount(amount, currency);
  const withdrawalId = useMemo(
    () => `withdrawal-${destination.id}-${currency.toLowerCase()}-${amount}`,
    [amount, currency, destination.id],
  );

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const requestedAmount = digits ? Number(digits) : 0;
    const nextAmount = requestedAmount;
    const formatted = nextAmount ? formatWholeAmount(nextAmount) : '';
    setAmount(nextAmount);
    if (formatted !== value) amountText.set(formatted);
  };

  const chooseQuickAmount = (value: number) => {
    const nextAmount = value;
    setAmount(nextAmount);
    amountText.set(formatWholeAmount(nextAmount));
  };

  const chooseCurrency = (nextCurrency: WithdrawalCurrency) => {
    setCurrency(nextCurrency);
    amountText.set(amount ? formatWholeAmount(amount) : '');
  };

  const goBack = () => {
    if (step === 'amount') {
      router.back();
      return;
    }
    if (step === 'destination') setStep('amount');
    if (step === 'review') setStep('destination');
    if (step === 'processing') setStep('review');
  };

  const finishAtWallet = () => router.replace('/pay');
  const viewTransaction = () =>
    router.replace({
      pathname: '/activity',
      params: { segment: 'payments', transactionId: withdrawalId },
    });

  const processingSteps = [
    {
      id: 'initiated',
      title: 'Withdrawal initiated',
      subtitle: 'Just now',
      state: processingRowState(withdrawalStatus, 'initiated', quote.requiresEarnUnwind),
    },
    ...(quote.requiresEarnUnwind
      ? [{
          id: 'unwinding',
          title: 'Moving funds from Earn',
          subtitle: formatUsd(quote.earnUnwindAmount),
          state: processingRowState(withdrawalStatus, 'unwinding', true),
        }]
      : []),
    {
      id: 'converting',
      title: 'Converting',
      subtitle: `Preparing ${currency}`,
      state: processingRowState(withdrawalStatus, 'converting', quote.requiresEarnUnwind),
    },
    {
      id: 'sending',
      title: destination.kind === 'bank' ? 'Sending to bank' : 'Sending to wallet',
      subtitle: destination.name,
      state: processingRowState(withdrawalStatus, 'sending', quote.requiresEarnUnwind),
    },
    {
      id: 'completed',
      title: destination.kind === 'bank' ? 'Bank credited' : 'Wallet credited',
      subtitle: destination.detail,
      state: processingRowState(withdrawalStatus, 'completed', quote.requiresEarnUnwind),
    },
  ];

  return (
    <FlowScreenShell>
      {step === 'amount' ? (
        <FlowAmountEntry
          amount={amount}
          amountAccessory={(
            <FlowCurrencyMenu
              accessibilityName="Payout currency"
              onChange={chooseCurrency}
              options={withdrawOptions}
              value={currency}
            />
          )}
          amountText={amountText}
          currencySymbol={CURRENCY_SYMBOLS[currency]}
          formatQuickAmount={(value) => formatPayoutAmount(value, currency, false)}
          isContinueDisabled={amount <= 0 || !quote.hasSufficientTotal}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('destination')}
          onQuickAmount={chooseQuickAmount}
          quickAmounts={quickWithdrawalAmounts}
          selectionSymbol="wallet.bifold.fill"
          selectionTitle={`Available ${formatUsd(balances.available)}`}
          summary={
            <WithdrawalAmountSummary intent={intent} quote={quote} quoteState={liveQuote} ruledOut={ruledOut} />
          }
          title="Withdraw"
        />
      ) : null}

      {step === 'destination' ? (
        <DestinationStep
          onBack={goBack}
          onSelectDestination={(nextDestination) => {
            setDestination(nextDestination);
            setStep('review');
          }}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          destination={destination}
          error={submitError}
          intent={intent}
          onBack={goBack}
          onConfirm={() => {
            if (destination.kind !== 'bank') {
              setSubmitError('Wallet withdrawals are not available. Use a TRY bank destination.');
              return;
            }
            const live = liveQuote.data;
            if (!live) return;
            setSubmitError(null);
            setWithdrawalStatus('sending');
            setStep('processing');
            void (async () => {
              try {
                await executeWithdrawTry({
                  accountId: account.id,
                  live,
                  tryAmount: amount,
                  currency,
                  approveEarnUnwind: quote.requiresEarnUnwind,
                });
                setWithdrawalStatus('completed');
                setStep('success');
              } catch (err) {
                setSubmitError(errorMessage(err));
                setWithdrawalStatus('failed');
                setStep('review');
              }
            })();
          }}
          quote={quote}
        />
      ) : null}

      {step === 'processing' ? (
        <FlowProcessingState
          headerTitle="Withdrawing"
          stateTitle="Sending your money"
          supportingLines={['This usually takes a moment.']}
          symbol="arrow.down.to.line"
          steps={processingSteps}
          noticeTitle="You can close this screen"
          noticeSubtitle="We’ll notify you when it’s complete."
          onBack={goBack}
        />
      ) : null}

      {step === 'success' ? (
        <FlowSuccessState
          amount={receiveAmount}
          noticeSubtitle={`${receiveAmount} was sent to your ${destination.kind === 'bank' ? 'bank account' : 'wallet'}.`}
          noticeSymbol="checkmark.circle.fill"
          noticeTitle="Withdrawal completed"
          onClose={finishAtWallet}
          onDone={finishAtWallet}
          onSecondaryPress={viewTransaction}
          secondaryLabel="View transaction"
          supportingText={`${destination.name}\n${destination.detail}`}
          title="Withdrawal sent"
        />
      ) : null}
    </FlowScreenShell>
  );
}
