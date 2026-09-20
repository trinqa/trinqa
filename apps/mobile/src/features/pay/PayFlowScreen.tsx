import { useMemo, useState } from 'react';

import {
  BottomSheet,
  Button,
  Divider,
  Group,
  HStack,
  Image,
  Spacer,
  Text,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';

import { FlowAmountEntry } from '@/components/FlowAmountEntry';
import { FlowCurrencyMenu } from '@/components/FlowCurrencyMenu';
import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  FlowProcessingState,
  FlowStepLayout,
  FlowSuccessState,
  PrimaryActionButton,
  SecondaryActionButton,
  type FlowProcessingRowState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { FlowEmptyState, FlowInlineState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  paymentCurrencies,
  paymentRecipients,
  quickPaymentAmounts,
} from '@/data/mocks/pay';
import { liveCurrenciesFor, payoutBlockedReason } from '@/data/capabilities';
import { describeCode, errorMessage } from '@/services/apiErrors';
import {
  useRecipientAccount,
  type RecipientAccount,
  type RecipientAccountState,
} from '@/services/contacts';
import { executePay, quotePay, type PayLiveQuote } from '@/services/flows';
import { useLiveQuote, type LiveQuoteState } from '@/services/useLiveQuote';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import { cardChromeModifiers } from '@/theme/swiftUi';
import type {
  PaymentCurrency,
  PaymentIntent,
  PaymentQuote,
  PaymentRecipient,
  PaymentStatus,
  PaymentStep,
} from '@/types';

const CURRENCY_SYMBOLS: Record<PaymentCurrency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  BRL: 'R$',
};

const PAYMENT_STATUS_ORDER: Exclude<PaymentStatus, 'failed'>[] = [
  'initiated',
  'converting',
  'sending',
  'completed',
];

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPaymentAmount(
  value: number,
  currency: PaymentCurrency,
  decimals = true,
) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })} ${CURRENCY_SYMBOLS[currency]}`;
}

/** Stellar accounts are 56 characters; the ends are enough to check against an explorer. */
function shortAccount(account: string) {
  return `${account.slice(0, 6)}…${account.slice(-6)}`;
}

// Debits and fees are USDC, presented as USD across the app.
function formatTry(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} $`;
}

/** Maps the BFF payment quote onto the review model. Without a live quote nothing is payable. */
function toPaymentQuote(intent: PaymentIntent, live: PayLiveQuote | null): PaymentQuote {
  if (!live) {
    return {
      receiveAmount: intent.receiveAmount,
      receiveCurrency: intent.receiveCurrency,
      debitAmount: 0,
      debitCurrency: 'USD',
      fee: 0,
      exchangeRate: 0,
      estimatedArrival: '—',
      routeId: 'pending',
      hasSufficientAvailable: false,
      hasSufficientTotal: false,
      availableContribution: 0,
      earnContribution: 0,
      status: 'unavailable',
    };
  }
  const { quote } = live;
  const debitAmount = Number(quote.debitAmount);
  const earnContribution = Number(quote.funding?.earnContribution ?? 0);
  return {
    receiveAmount: Number(quote.receiveAmount),
    receiveCurrency: intent.receiveCurrency,
    debitAmount,
    debitCurrency: 'USD',
    fee: Number(quote.fee.amount),
    exchangeRate: intent.receiveAmount > 0 ? debitAmount / intent.receiveAmount : 0,
    estimatedArrival: `~${quote.estimatedArrivalMinutes} min`,
    routeId: quote.routeType,
    hasSufficientAvailable: earnContribution === 0,
    hasSufficientTotal: true,
    availableContribution: Number(quote.funding?.availableContribution ?? debitAmount),
    earnContribution,
    status: 'ready',
  };
}

function processingRowState(
  status: PaymentStatus,
  rowStatus: Exclude<PaymentStatus, 'failed'>,
): FlowProcessingRowState {
  if (status === 'failed') return 'pending';
  const currentIndex = PAYMENT_STATUS_ORDER.indexOf(status);
  const rowIndex = PAYMENT_STATUS_ORDER.indexOf(rowStatus);
  if (rowIndex < currentIndex) return 'complete';
  if (rowIndex === currentIndex) return 'current';
  return 'pending';
}

function RecipientRow({
  onPress,
  recipient,
}: {
  onPress: () => void;
  recipient: PaymentRecipient;
}) {
  const row = componentTokens.selectionRow;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`Pay ${recipient.name}, ${recipient.detail}`),
        frame({ width: screenTokens.paymentFlow.contentWidth, height: row.height }),
        ...cardChromeModifiers(row.radius),
      ]}
    >
      <HStack
        alignment="center"
        spacing={row.contentGap}
        modifiers={[
          padding({ horizontal: row.horizontalPadding }),
          frame({ width: screenTokens.paymentFlow.contentWidth, height: row.height }),
        ]}
      >
        <ZStack
          modifiers={[
            frame({ width: row.iconSize, height: row.iconSize }),
            background(colors.surfaceLayer, shapes.circle()),
          ]}
        >
          <Image systemName={recipient.symbol} size={row.symbolSize} color={colors.textSecondary} />
        </ZStack>
        <VStack alignment="leading" spacing={3}>
          <Text
            modifiers={[
              font({ size: typography.label, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {recipient.name}
          </Text>
          <Text modifiers={[font({ size: typography.caption, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {recipient.detail}
          </Text>
        </VStack>
        <Spacer />
        <Image systemName="chevron.right" size={12} color={colors.textSecondary} />
      </HStack>
    </Button>
  );
}

function PaymentMethodButton({
  label,
  onPress,
  symbol,
}: {
  label: string;
  onPress: () => void;
  symbol: SFSymbol;
}) {
  const payment = screenTokens.paymentFlow;
  const width = (payment.contentWidth - payment.methodGap * 2) / 3;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(label),
        frame({ width, height: payment.methodHeight }),
        ...cardChromeModifiers(componentTokens.surface.controlRadius),
      ]}
    >
      <VStack alignment="center" spacing={7} modifiers={[frame({ width, height: payment.methodHeight })]}>
        <Image systemName={symbol} size={19} color={colors.textPrimary} />
        <Text
          modifiers={[
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {label}
        </Text>
      </VStack>
    </Button>
  );
}

function RecipientStep({
  onBack,
  onSelectRecipient,
}: {
  onBack: () => void;
  onSelectRecipient: (recipient: PaymentRecipient) => void;
}) {
  const payment = screenTokens.paymentFlow;

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: payment.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader showBack title="Pay" onBackPress={onBack} />
      </Group>

      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ top: payment.headerToContent }), frame({ width: payment.contentWidth })]}
      >
        <Text modifiers={[font({ size: typography.body, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
          Who are you paying?
        </Text>
        <Text
          modifiers={[
            padding({ top: 18 }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Recent
        </Text>
        <VStack spacing={payment.recipientRowGap} modifiers={[padding({ top: 8 })]}>
          {paymentRecipients.length === 0 ? (
            <FlowEmptyState title="No recent recipients" subtitle="People you pay will show up here." />
          ) : null}
          {paymentRecipients.map((recipient) => (
            <RecipientRow
              key={recipient.id}
              recipient={recipient}
              onPress={() => onSelectRecipient(recipient)}
            />
          ))}
        </VStack>

        <Text
          modifiers={[
            padding({ top: payment.methodTopGap }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Other ways
        </Text>
        <HStack spacing={payment.methodGap} modifiers={[padding({ top: 8 })]}>
          <PaymentMethodButton
            label="Contact"
            symbol="person.crop.circle"
            onPress={() => onSelectRecipient(paymentRecipients[0])}
          />
          <PaymentMethodButton
            label="Scan QR"
            symbol="qrcode.viewfinder"
            onPress={() => onSelectRecipient(paymentRecipients[2])}
          />
          <PaymentMethodButton
            label="Wallet"
            symbol="wallet.bifold"
            onPress={() => onSelectRecipient(paymentRecipients[1])}
          />
        </HStack>
      </VStack>
      <Spacer />
    </VStack>
  );
}

function PaymentAmountSummary({
  intent,
  quote,
  quoteState,
  recipientLabel,
  recipientState,
  onAddMoney,
  blockedReason,
}: {
  intent: PaymentIntent;
  quote: PaymentQuote;
  quoteState: LiveQuoteState<PayLiveQuote>;
  recipientLabel: string;
  recipientState: RecipientAccountState;
  onAddMoney: () => void;
  blockedReason: string | null;
}) {
  const ready = Boolean(quoteState.data);
  return (
    <VStack spacing={8}>
      <FlowCard height={screenTokens.paymentFlow.summaryHeight}>
        <VStack
          alignment="leading"
          spacing={8}
          modifiers={[
            padding({ horizontal: screenTokens.paymentFlow.cardPadding, vertical: 12 }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {recipientLabel} receives
          </Text>
          <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency)}
          </Text>
          <Divider />
          <FlowInfoRow
            label="Total deducted"
            value={
              ready
                ? formatTry(quote.debitAmount)
                : blockedReason
                  ? 'Unavailable'
                  : quoteState.loading
                    ? 'Getting a live quote…'
                    : '—'
            }
          />
          <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
            <FlowInfoRow label="Fee" value={ready ? formatTry(quote.fee) : '—'} />
            <FlowInfoRow label="Arrival" value={quote.estimatedArrival} />
          </HStack>
        </VStack>
      </FlowCard>
      {blockedReason ? (
        <FlowInlineState
          symbol="exclamationmark.circle"
          title={`${intent.receiveCurrency} payouts aren’t live yet`}
          subtitle={describeCode(blockedReason)}
        />
      ) : recipientState.loading ? (
        <FlowInlineState
          symbol="clock"
          title={`Preparing ${intent.recipient.name}’s account`}
          subtitle="This can take a few seconds the first time."
        />
      ) : recipientState.error ? (
        <FlowInlineState
          symbol="exclamationmark.circle"
          tone="danger"
          title={`We could not prepare ${intent.recipient.name}’s account`}
          subtitle={recipientState.error}
        />
      ) : quoteState.error ? (
        <VStack spacing={8}>
          <FlowInlineState
            symbol="exclamationmark.circle"
            tone="danger"
            title="Quote unavailable"
            subtitle={quoteState.error}
            onRetry={quoteState.retry}
          />
          {quoteState.code === 'INSUFFICIENT_BALANCE' ? (
            <SecondaryActionButton label="Add Money" onPress={onAddMoney} />
          ) : null}
        </VStack>
      ) : ready && quote.earnContribution > 0 ? (
        <FlowInlineState
          symbol="arrow.uturn.backward.circle"
          title="Part of this payment is currently earning"
          subtitle={`Needed from Earn ${formatTry(quote.earnContribution)}`}
        />
      ) : null}
    </VStack>
  );
}

function EarnLiquidityApprovalSheet({
  anchor,
  isPresented,
  onApprove,
  onCancel,
  quote,
}: {
  anchor: React.ReactElement;
  isPresented: boolean;
  onApprove: () => void;
  onCancel: () => void;
  quote: PaymentQuote;
}) {
  return (
    <BottomSheet
      isPresented={isPresented}
      onIsPresentedChange={(next) => {
        if (!next) onCancel();
      }}
      anchor={anchor}
    >
      <Group
        modifiers={[
          presentationDetents([{ height: 380 }]),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        <VStack alignment="leading" spacing={14} modifiers={[padding({ top: 18, bottom: 14, horizontal: 18 })]}>
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
              Use money from Earn?
            </Text>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
              Trinqa needs to move part of this payment back to available.
            </Text>
          </VStack>
          <Divider />
          <FlowInfoRow label="From Available" value={formatTry(quote.availableContribution)} />
          <FlowInfoRow label="Needed from Earn" value={formatTry(quote.earnContribution)} emphasized />
          <FlowInlineState
            symbol="info.circle"
            title="Explicit approval"
            subtitle="The Earn amount is included in the total deducted."
          />
          <PrimaryActionButton label="Approve and review" onPress={onApprove} />
          <SecondaryActionButton label="Cancel" onPress={onCancel} />
        </VStack>
      </Group>
    </BottomSheet>
  );
}

function ReviewStep({
  intent,
  onBack,
  onConfirm,
  quote,
  recipient,
  settlementAmount,
  settlementAsset,
  error,
  isSubmitting,
}: {
  intent: PaymentIntent;
  onBack: () => void;
  onConfirm: () => void;
  quote: PaymentQuote;
  recipient: RecipientAccount | null;
  settlementAmount: string | null;
  settlementAsset: string | null;
  error?: string | null;
  isSubmitting: boolean;
}) {
  // Show what the backend quoted as moving; the picked currency is only the user's unit.
  const sendingAmount =
    settlementAmount ?? formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);

  return (
    <FlowStepLayout
      title="Review"
      onBack={onBack}
      primaryLabel="Confirm"
      onPrimaryPress={onConfirm}
      isPrimaryDisabled={quote.status !== 'ready' || !recipient}
      isPrimaryBusy={isSubmitting}
    >
      <VStack
        alignment="leading"
        spacing={screenTokens.paymentFlow.cardGap}
        modifiers={[padding({ top: spacing.xxxl })]}
      >
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[padding({ all: screenTokens.paymentFlow.cardPadding })]}
          >
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  You’re sending
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {sendingAmount}
                </Text>
              </VStack>
              <Spacer />
              <ZStack
                modifiers={[
                  frame({ width: 36, height: 36 }),
                  background(colors.surfaceLayer, shapes.circle()),
                ]}
              >
                <Image systemName="paperplane.fill" size={16} color={colors.action} />
              </ZStack>
            </HStack>

            <Divider />
            {recipient === null ? (
              <FlowInfoRow label="To" value="—" emphasized />
            ) : recipient.overridden ? (
              <FlowInfoRow label="To" value={shortAccount(recipient.account)} emphasized />
            ) : (
              <VStack alignment="leading" spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                <FlowInfoRow label="To" value={intent.recipient.name} emphasized />
                <FlowInfoRow label="Stellar account" value={shortAccount(recipient.account)} />
              </VStack>
            )}
            <Divider />
            <FlowInfoRow
              label={
                recipient?.overridden
                  ? 'The test account receives'
                  : `${intent.recipient.name} receives`
              }
              value={sendingAmount}
            />
            <FlowInfoRow label="You’ll pay" value={formatTry(quote.debitAmount)} />
            <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
            <FlowInfoRow label="Estimated arrival" value={quote.estimatedArrival} />
            <FlowInfoRow
              label="Exchange rate"
              value={`1 ${CURRENCY_SYMBOLS[intent.receiveCurrency]} ≈ ${formatTry(quote.exchangeRate)}`}
            />
            {quote.earnContribution > 0 ? (
              <VStack alignment="leading" spacing={10} modifiers={[frame({ maxWidth: Infinity })]}>
                <Divider />
                <FlowInfoRow label="From Available" value={formatTry(quote.availableContribution)} />
                <FlowInfoRow label="From Earn" value={formatTry(quote.earnContribution)} />
              </VStack>
            ) : null}
          </VStack>
        </FlowCard>

        {recipient?.overridden ? (
          <FlowNotice
            symbol="exclamationmark.triangle"
            title={`Not going to ${intent.recipient.name}`}
            subtitle="This build sends every payment to one fixed test account."
          />
        ) : null}
        {settlementAsset ? (
          <FlowNotice
            symbol="arrow.triangle.branch"
            title={`Sent as ${settlementAsset} on Stellar`}
            subtitle={`You picked ${intent.receiveCurrency}. On Stellar the money moves as ${settlementAsset}.`}
          />
        ) : null}
        {recipient ? null : (
          <FlowInlineState
            symbol="exclamationmark.circle"
            title={`We could not prepare ${intent.recipient.name}’s account`}
            subtitle="The payment is blocked until the account is ready."
          />
        )}
        {error ? (
          <FlowInlineState symbol="exclamationmark.circle" tone="danger" title="Payment failed" subtitle={error} />
        ) : null}
      </VStack>
    </FlowStepLayout>
  );
}

export function PayFlowScreen() {
  const router = useRouter();
  const { account, capabilities } = useMockAppState();
  const [step, setStep] = useState<PaymentStep>('recipient');
  const [recipient, setRecipient] = useState(paymentRecipients[0]);
  const [currency, setCurrency] = useState<PaymentCurrency>('USD');
  const [amount, setAmount] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('initiated');
  const [earnApprovalPresented, setEarnApprovalPresented] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Snapshot of what the confirmed quote actually moved, so success cannot name a different asset.
  const [sentAmount, setSentAmount] = useState<string | null>(null);
  const paymentId = useMemo(
    () => `payment-${recipient.id}-${currency.toLowerCase()}-${amount}`,
    [amount, currency, recipient.id]
  );
  const amountText = useNativeState(formatWholeAmount(1));
  const currencies = liveCurrenciesFor('pay', capabilities);
  const payOptions = currencies.length ? currencies : paymentCurrencies;

  const intent = useMemo<PaymentIntent>(
    () => ({ recipientId: recipient.id, recipient, receiveAmount: amount, receiveCurrency: currency }),
    [amount, currency, recipient],
  );
  const blocked = payoutBlockedReason(currency, capabilities);
  // Seeding the contacts is slow once, so start as soon as the screen opens.
  const recipientState = useRecipientAccount(recipient.id);
  const recipientAccountId = recipientState.data?.account ?? null;
  const liveQuote = useLiveQuote(
    `${account.id}:${recipientAccountId ?? 'unresolved'}:${currency}:${amount}`,
    amount > 0 && !blocked && Boolean(recipientAccountId),
    () =>
      quotePay({
        // quotePay refuses an empty recipient, so an unresolved contact can never fall back to the sender.
        accountId: account.id,
        recipientAccount: recipientAccountId ?? '',
        amount,
        currency,
      }),
  );
  const quote = useMemo(() => toPaymentQuote(intent, liveQuote.data), [intent, liveQuote.data]);
  const receiveAmount = formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);
  // The backend quotes and settles USDC; the picked currency is only how the user typed the amount.
  const settlementAsset = liveQuote.data?.quote.receiveCurrency ?? null;
  const settlementAmount = liveQuote.data
    ? `${Number(liveQuote.data.quote.receiveAmount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${liveQuote.data.quote.receiveCurrency}`
    : null;
  const recipientLabel = recipientState.data?.overridden
    ? shortAccount(recipientState.data.account)
    : recipient.name;
  const successAmount = sentAmount ?? receiveAmount;

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

  const chooseCurrency = (nextCurrency: PaymentCurrency) => {
    setCurrency(nextCurrency);
    if (recipient.preferredCurrency !== nextCurrency) {
      setAmount(amount);
      amountText.set(amount ? formatWholeAmount(amount) : '');
    }
  };

  const goBack = () => {
    if (step === 'recipient') {
      router.back();
      return;
    }
    if (step === 'amount') setStep('recipient');
    if (step === 'review') setStep('amount');
    // 'processing' has no back: the payment is already in flight.
  };

  const finishAtHome = () => router.replace('/');
  const viewTransaction = () =>
    router.replace({
      pathname: '/activity',
      params: { segment: 'payments', transactionId: paymentId },
    });

  const processingSteps = [
    {
      id: 'initiated',
      title: 'Payment initiated',
      subtitle: 'Just now',
      state: processingRowState(paymentStatus, 'initiated'),
    },
    {
      id: 'converting',
      title: 'Converting funds',
      subtitle: 'Preparing the payment',
      state: processingRowState(paymentStatus, 'converting'),
    },
    {
      id: 'sending',
      title: 'Sending payment',
      subtitle: 'This won’t take long',
      state: processingRowState(paymentStatus, 'sending'),
    },
    {
      id: 'completed',
      title: 'Recipient credited',
      subtitle: recipientLabel,
      state: processingRowState(paymentStatus, 'completed'),
    },
  ] as const;

  return (
    <FlowScreenShell>
      {step === 'recipient' ? (
        <RecipientStep
          onBack={goBack}
          onSelectRecipient={(nextRecipient) => {
            setRecipient(nextRecipient);
            const preferred = nextRecipient.preferredCurrency;
            if (preferred && !payoutBlockedReason(preferred, capabilities)) setCurrency(preferred);
            else setCurrency('USD');
            setStep('amount');
          }}
        />
      ) : null}

      {step === 'amount' ? (
        <EarnLiquidityApprovalSheet
          isPresented={earnApprovalPresented}
          onCancel={() => setEarnApprovalPresented(false)}
          onApprove={() => {
            setEarnApprovalPresented(false);
            setStep('review');
          }}
          quote={quote}
          anchor={<FlowAmountEntry
          amount={amount}
          amountAccessory={(
            <FlowCurrencyMenu
              accessibilityName="Recipient currency"
              onChange={chooseCurrency}
              options={payOptions}
              value={currency}
            />
          )}
          amountText={amountText}
          currencySymbol={CURRENCY_SYMBOLS[currency]}
          formatQuickAmount={(value) => formatPaymentAmount(value, currency, false)}
          isContinueDisabled={
            amount <= 0 ||
            !recipientAccountId ||
            !quote.hasSufficientTotal ||
            quote.status === 'unavailable'
          }
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => {
            if (quote.earnContribution > 0) setEarnApprovalPresented(true);
            else setStep('review');
          }}
          onQuickAmount={chooseQuickAmount}
          quickAmounts={quickPaymentAmounts}
          selectionSymbol={recipient.symbol}
          selectionTitle={recipient.name}
          summary={(
            <PaymentAmountSummary
              intent={intent}
              quote={quote}
              quoteState={liveQuote}
              recipientLabel={recipientLabel}
              recipientState={recipientState}
              onAddMoney={() => router.push('/add-money')}
              blockedReason={blocked}
            />
          )}
          title="Pay"
        />}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          error={submitError}
          intent={intent}
          onBack={goBack}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            const live = liveQuote.data;
            const resolved = recipientState.data;
            // No recipient, no payment: it must never fall back to the sender's own account.
            if (!live || !resolved || isSubmitting) return;
            setSubmitError(null);
            setIsSubmitting(true);
            setSentAmount(settlementAmount);
            setPaymentStatus('initiated');
            setStep('processing');
            void (async () => {
              try {
                await executePay({
                  accountId: account.id,
                  recipientAccount: resolved.account,
                  live,
                  amount,
                  currency,
                  approveEarnUnwind: quote.earnContribution > 0,
                  onStage: setPaymentStatus,
                });
                setPaymentStatus('completed');
                setStep('success');
              } catch (err) {
                setSubmitError(errorMessage(err));
                setPaymentStatus('failed');
                setStep('review');
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}
          quote={quote}
          recipient={recipientState.data}
          settlementAmount={settlementAmount}
          settlementAsset={settlementAsset}
        />
      ) : null}

      {step === 'processing' ? (
        <FlowProcessingState
          headerTitle="Sending"
          stateTitle="Sending your payment"
          supportingLines={['This usually takes a moment.']}
          symbol="paperplane.fill"
          steps={processingSteps}
          noticeTitle="Keep this screen open"
          noticeSubtitle="We’ll move you on as soon as the recipient is credited."
        />
      ) : null}

      {step === 'success' ? (
        <FlowSuccessState
          amount={successAmount}
          noticeSubtitle={`${recipientLabel} received ${successAmount}.`}
          noticeSymbol="checkmark.circle.fill"
          noticeTitle="Payment completed"
          onClose={finishAtHome}
          onDone={finishAtHome}
          onSecondaryPress={viewTransaction}
          secondaryLabel="View transaction"
          supportingText={recipientLabel}
          title="Payment sent"
        />
      ) : null}
    </FlowScreenShell>
  );
}
