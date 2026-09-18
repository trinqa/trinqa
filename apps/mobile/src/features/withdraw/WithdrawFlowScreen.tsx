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
  createWithdrawalQuote,
  quickWithdrawalAmounts,
  withdrawalCurrencies,
  withdrawalDestinations,
} from '@/data/mocks/withdraw';
import { recordWithdrawal, useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
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
  return `${CURRENCY_SYMBOLS[currency]}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

function formatUsd(value: number) {
  return `₺${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUsdRate(value: number) {
  return `₺${value.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
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
            background(colors.surfaceSecondary, shapes.circle()),
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
          <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
            <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
      <Group modifiers={[padding({ horizontal: 8 })]}>
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
}: {
  intent: WithdrawalIntent;
  quote: WithdrawalQuote;
}) {
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
          <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
          <FlowInfoRow label="Estimated debit" value={formatUsd(quote.debitAmount)} />
          <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
            <FlowInfoRow label="Fee" value={formatUsd(quote.fee)} />
            <FlowInfoRow label="Arrival" value={quote.estimatedArrival} />
          </HStack>
          <FlowInfoRow
            label="Exchange rate"
            value={`${CURRENCY_SYMBOLS[intent.payoutCurrency]}1 ≈ ${formatUsdRate(quote.exchangeRate)}`}
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
      {!quote.hasSufficientTotal ? (
        <FlowInlineState
          symbol="exclamationmark.circle"
          title="Not enough balance"
          subtitle="Add money or change the amount to continue."
        />
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
}: {
  destination: WithdrawalDestination;
  intent: WithdrawalIntent;
  onBack: () => void;
  onConfirm: () => void;
  quote: WithdrawalQuote;
}) {
  const receiveAmount = formatPayoutAmount(intent.amount, intent.payoutCurrency);

  return (
    <FlowStepLayout title="Review" onBack={onBack} primaryLabel="Confirm" onPrimaryPress={onConfirm}>
      <VStack alignment="leading" spacing={screenTokens.paymentFlow.cardGap} modifiers={[padding({ top: 24 })]}>
        <FlowCard>
          <VStack alignment="leading" spacing={11} modifiers={[padding({ all: screenTokens.paymentFlow.cardPadding })]}>
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
              <ZStack modifiers={[frame({ width: 36, height: 36 }), background(colors.accentMuted, shapes.circle())]}>
                <Image systemName="arrow.down.to.line" size={16} color={colors.action} />
              </ZStack>
            </HStack>

            <Divider />
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>To</Text>
              <Spacer />
              <VStack alignment="trailing" spacing={2}>
                <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                  {destination.name}
                </Text>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
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
              value={`${CURRENCY_SYMBOLS[intent.payoutCurrency]}1 ≈ ${formatUsdRate(quote.exchangeRate)}`}
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

        <FlowNotice
          symbol="point.3.connected.trianglepath.dotted"
          title="Best route selected automatically"
          subtitle="Trinqa will use the best available payout route."
        />
      </VStack>
    </FlowStepLayout>
  );
}

export function WithdrawFlowScreen() {
  const router = useRouter();
  const { balances } = useMockAppState();
  const [step, setStep] = useState<WithdrawalStep>('amount');
  const [currency, setCurrency] = useState<WithdrawalCurrency>('EUR');
  const [amount, setAmount] = useState(500);
  const [destination, setDestination] = useState<WithdrawalDestination>(withdrawalDestinations[0]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus>('initiated');
  const amountText = useNativeState(formatWholeAmount(500));

  const intent = useMemo<WithdrawalIntent>(
    () => ({ amount, payoutCurrency: currency, destinationId: destination.id }),
    [amount, currency, destination.id],
  );
  const quote = useMemo(
    () => createWithdrawalQuote(intent, balances),
    [balances, intent],
  );
  const receiveAmount = formatPayoutAmount(amount, currency);
  const withdrawalId = useMemo(
    () => `withdrawal-${destination.id}-${currency.toLowerCase()}-${amount}`,
    [amount, currency, destination.id],
  );

  useEffect(() => {
    if (step !== 'processing') return;

    setWithdrawalStatus('initiated');
    const unwindTimer = quote.requiresEarnUnwind
      ? setTimeout(() => setWithdrawalStatus('unwinding'), 500)
      : null;
    const convertingTimer = setTimeout(
      () => setWithdrawalStatus('converting'),
      quote.requiresEarnUnwind ? 1050 : 650,
    );
    const sendingTimer = setTimeout(
      () => setWithdrawalStatus('sending'),
      quote.requiresEarnUnwind ? 1750 : 1350,
    );
    const completedTimer = setTimeout(() => {
      setWithdrawalStatus('completed');
      recordWithdrawal(withdrawalId, intent, quote, destination);
      setStep('success');
    }, quote.requiresEarnUnwind ? 3100 : 2600);

    return () => {
      if (unwindTimer) clearTimeout(unwindTimer);
      clearTimeout(convertingTimer);
      clearTimeout(sendingTimer);
      clearTimeout(completedTimer);
    };
  }, [destination, intent, quote, receiveAmount, step, withdrawalId]);

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
              options={withdrawalCurrencies}
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
          summary={<WithdrawalAmountSummary intent={intent} quote={quote} />}
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
          intent={intent}
          onBack={goBack}
          onConfirm={() => setStep('processing')}
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
