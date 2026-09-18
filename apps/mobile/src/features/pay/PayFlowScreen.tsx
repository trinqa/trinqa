import { useEffect, useMemo, useState } from 'react';

import {
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
  type FlowProcessingRowState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  createPaymentQuote,
  maximumReceiveAmount,
  paymentCurrencies,
  paymentRecipients,
  quickPaymentAmounts,
} from '@/data/mocks/pay';
import { recordCompletedPayment } from '@/data/mocks/paymentActivity';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
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
  return `${CURRENCY_SYMBOLS[currency]}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

function formatTry(value: number) {
  return `₺${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
            background(colors.surfaceSecondary, shapes.circle()),
          ]}
        >
          <Image systemName={recipient.symbol} size={row.symbolSize} color={colors.textSecondary} />
        </ZStack>
        <VStack alignment="leading" spacing={3}>
          <Text
            modifiers={[
              font({ size: typography.transactionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {recipient.name}
          </Text>
          <Text modifiers={[font({ size: typography.transactionMeta }), foregroundStyle(colors.textSecondary)]}>
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
            font({ size: typography.caption, weight: 'medium' }),
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
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Pay" onBackPress={onBack} />
      </Group>

      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ top: payment.headerToContent }), frame({ width: payment.contentWidth })]}
      >
        <Text modifiers={[font({ size: typography.body }), foregroundStyle(colors.textSecondary)]}>
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
}: {
  intent: PaymentIntent;
  quote: PaymentQuote;
}) {
  return (
    <FlowCard height={screenTokens.paymentFlow.summaryHeight}>
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[
          padding({ horizontal: screenTokens.paymentFlow.cardPadding, vertical: 12 }),
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
        ]}
      >
        <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
          {intent.recipient.name} receives
        </Text>
        <Text
          modifiers={[
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency)}
        </Text>
        <Divider />
        <FlowInfoRow label="You’ll pay" value={formatTry(quote.debitAmount)} />
        <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
          <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
          <FlowInfoRow label="Arrival" value={quote.estimatedArrival} />
        </HStack>
      </VStack>
    </FlowCard>
  );
}

function ReviewStep({
  intent,
  onBack,
  onConfirm,
  quote,
}: {
  intent: PaymentIntent;
  onBack: () => void;
  onConfirm: () => void;
  quote: PaymentQuote;
}) {
  const receiveAmount = formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);

  return (
    <FlowStepLayout title="Review" onBack={onBack} primaryLabel="Confirm" onPrimaryPress={onConfirm}>
      <VStack
        alignment="leading"
        spacing={screenTokens.paymentFlow.cardGap}
        modifiers={[padding({ top: 24 })]}
      >
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[padding({ all: screenTokens.paymentFlow.cardPadding })]}
          >
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
                  background(colors.accentMuted, shapes.circle()),
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
              value={`${CURRENCY_SYMBOLS[intent.receiveCurrency]}1 ≈ ${formatTry(quote.exchangeRate)}`}
            />
          </VStack>
        </FlowCard>

        <FlowNotice
          symbol="arrow.triangle.branch"
          title="Fast & routed automatically"
          subtitle="Trinqa finds the best available route for this payment."
        />
      </VStack>
    </FlowStepLayout>
  );
}

export function PayFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<PaymentStep>('recipient');
  const [recipient, setRecipient] = useState(paymentRecipients[0]);
  const [currency, setCurrency] = useState<PaymentCurrency>('EUR');
  const [amount, setAmount] = useState(250);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('initiated');
  const paymentId = useMemo(
    () => `payment-${recipient.id}-${currency.toLowerCase()}-${amount}`,
    [amount, currency, recipient.id]
  );
  const amountText = useNativeState(formatWholeAmount(250));

  const intent = useMemo<PaymentIntent>(
    () => ({ recipient, receiveAmount: amount, receiveCurrency: currency }),
    [amount, currency, recipient],
  );
  const quote = useMemo(() => createPaymentQuote(intent), [intent]);
  const receiveAmount = formatPaymentAmount(intent.receiveAmount, intent.receiveCurrency);

  useEffect(() => {
    if (step !== 'processing') return;

    setPaymentStatus('initiated');
    const convertingTimer = setTimeout(() => setPaymentStatus('converting'), 650);
    const sendingTimer = setTimeout(() => setPaymentStatus('sending'), 1350);
    const completedTimer = setTimeout(() => {
      setPaymentStatus('completed');
      recordCompletedPayment(paymentId, intent, receiveAmount);
      setStep('success');
    }, 2600);

    return () => {
      clearTimeout(convertingTimer);
      clearTimeout(sendingTimer);
      clearTimeout(completedTimer);
    };
  }, [intent, paymentId, receiveAmount, step]);

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const requestedAmount = digits ? Number(digits) : 0;
    const nextAmount = Math.min(requestedAmount, maximumReceiveAmount(currency));
    const formatted = nextAmount ? formatWholeAmount(nextAmount) : '';

    setAmount(nextAmount);
    if (formatted !== value) amountText.set(formatted);
  };

  const chooseQuickAmount = (value: number) => {
    const nextAmount = Math.min(value, maximumReceiveAmount(currency));
    setAmount(nextAmount);
    amountText.set(formatWholeAmount(nextAmount));
  };

  const chooseCurrency = (nextCurrency: PaymentCurrency) => {
    const nextAmount = Math.min(amount, maximumReceiveAmount(nextCurrency));
    setCurrency(nextCurrency);
    setAmount(nextAmount);
    amountText.set(nextAmount ? formatWholeAmount(nextAmount) : '');
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
            setStep('amount');
          }}
        />
      ) : null}

      {step === 'amount' ? (
        <FlowAmountEntry
          amount={amount}
          amountAccessory={(
            <FlowCurrencyMenu
              accessibilityName="Recipient currency"
              onChange={chooseCurrency}
              options={paymentCurrencies}
              value={currency}
            />
          )}
          amountText={amountText}
          currencySymbol={CURRENCY_SYMBOLS[currency]}
          formatQuickAmount={(value) => formatPaymentAmount(value, currency, false)}
          isContinueDisabled={amount <= 0 || !quote.hasSufficientAvailable}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('review')}
          onQuickAmount={chooseQuickAmount}
          quickAmounts={quickPaymentAmounts}
          selectionSymbol={recipient.symbol}
          selectionTitle={recipient.name}
          summary={<PaymentAmountSummary intent={intent} quote={quote} />}
          title="Pay"
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          intent={intent}
          onBack={goBack}
          onConfirm={() => setStep('processing')}
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
