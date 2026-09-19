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
import { FlowInlineState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  createPaymentQuote,
  paymentCurrencies,
  paymentRecipients,
  quickPaymentAmounts,
} from '@/data/mocks/pay';
import { recordPayment, useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, motion, screenTokens, spacing, typography } from '@/theme';
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

function formatTry(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`;
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
  onAddMoney,
}: {
  intent: PaymentIntent;
  quote: PaymentQuote;
  onAddMoney: () => void;
}) {
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
            {intent.recipient.name} receives
          </Text>
          <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency)}
          </Text>
          <Divider />
          <FlowInfoRow label="Total deducted" value={formatTry(quote.debitAmount)} />
          <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
            <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
            <FlowInfoRow label="Arrival" value={quote.estimatedArrival} />
          </HStack>
        </VStack>
      </FlowCard>
      {quote.status === 'unavailable' ? (
        <FlowInlineState
          symbol="exclamationmark.triangle"
          title="Quote unavailable"
          subtitle="Change the amount and try again."
        />
      ) : !quote.hasSufficientTotal ? (
        <VStack spacing={8}>
          <FlowInlineState
            symbol="exclamationmark.circle"
            title="Not enough balance"
            subtitle="Add money or change the amount to continue."
          />
          <SecondaryActionButton label="Add Money" onPress={onAddMoney} />
        </VStack>
      ) : quote.earnContribution > 0 ? (
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
  error,
}: {
  intent: PaymentIntent;
  onBack: () => void;
  onConfirm: () => void;
  quote: PaymentQuote;
  error?: string | null;
}) {
  const receiveAmount = formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);

  return (
    <FlowStepLayout title="Review" onBack={onBack} primaryLabel="Confirm" onPrimaryPress={onConfirm}>
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
                  {receiveAmount}
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
            <FlowInfoRow label="To" value={intent.recipient.name} emphasized />
            <Divider />
            <FlowInfoRow label={`${intent.recipient.name} receives`} value={receiveAmount} />
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

        <FlowNotice
          symbol="arrow.triangle.branch"
          title="Fast & routed automatically"
          subtitle="Trinqa uses the live Stellar USDC rail when it is available."
        />
        {error ? (
          <FlowInlineState symbol="exclamationmark.circle" title="Payment failed" subtitle={error} />
        ) : null}
      </VStack>
    </FlowStepLayout>
  );
}

export function PayFlowScreen() {
  const router = useRouter();
  const { balances } = useMockAppState();
  const [step, setStep] = useState<PaymentStep>('recipient');
  const [recipient, setRecipient] = useState(paymentRecipients[0]);
  const [currency, setCurrency] = useState<PaymentCurrency>('USD');
  const [amount, setAmount] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('initiated');
  const [earnApprovalPresented, setEarnApprovalPresented] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const paymentId = useMemo(
    () => `payment-${recipient.id}-${currency.toLowerCase()}-${amount}`,
    [amount, currency, recipient.id]
  );
  const amountText = useNativeState(formatWholeAmount(1));
  const payOptions = paymentCurrencies;

  const intent = useMemo<PaymentIntent>(
    () => ({ recipientId: recipient.id, recipient, receiveAmount: amount, receiveCurrency: currency }),
    [amount, currency, recipient],
  );
  const quote = useMemo(() => createPaymentQuote(intent, balances), [balances, intent]);
  const receiveAmount = formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);

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
    if (step === 'processing') setStep('review');
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
      subtitle: recipient.name,
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
            if (preferred) setCurrency(preferred);
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
          isContinueDisabled={amount <= 0 || !quote.hasSufficientTotal || quote.status === 'unavailable'}
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
          summary={<PaymentAmountSummary intent={intent} quote={quote} onAddMoney={() => router.push('/add-money')} />}
          title="Pay"
        />}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          error={submitError}
          intent={intent}
          onBack={goBack}
          onConfirm={() => {
            setSubmitError(null);
            setPaymentStatus('sending');
            setStep('processing');
            setTimeout(() => {
              recordPayment(paymentId, intent, quote);
              setPaymentStatus('completed');
              setStep('success');
            }, motion.duration.flowProcessing);
          }}
          quote={quote}
        />
      ) : null}

      {step === 'processing' ? (
        <FlowProcessingState
          headerTitle="Sending"
          stateTitle="Sending your payment"
          supportingLines={['This usually takes a moment.']}
          symbol="paperplane.fill"
          steps={processingSteps}
          noticeTitle="You can close this screen"
          noticeSubtitle="We’ll notify you when it’s complete."
          onBack={goBack}
        />
      ) : null}

      {step === 'success' ? (
        <FlowSuccessState
          amount={receiveAmount}
          noticeSubtitle={`${recipient.name} received ${receiveAmount}.`}
          noticeSymbol="checkmark.circle.fill"
          noticeTitle="Payment completed"
          onClose={finishAtHome}
          onDone={finishAtHome}
          onSecondaryPress={viewTransaction}
          secondaryLabel="View transaction"
          supportingText={recipient.name}
          title="Payment sent"
        />
      ) : null}
    </FlowScreenShell>
  );
}
