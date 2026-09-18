import { useEffect, useMemo, useState } from 'react';

import {
  Divider,
  HStack,
  Image,
  Spacer,
  Text,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';

import { FlowAmountEntry } from '@/components/FlowAmountEntry';
import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  FlowProcessingState,
  FlowStepLayout,
  FlowSuccessState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import {
  addMoneySources,
  createAddMoneyQuote,
  quickAddMoneyAmounts,
} from '@/data/mocks/addMoney';
import { colors, screenTokens, typography } from '@/theme';
import type { AddMoneyQuote, AddMoneySourceId, AddMoneyStep } from '@/types';

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatTry(value: number, decimals = true) {
  return `₺${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

function formatUsdc(value: number) {
  return `≈ ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

interface AmountStepProps {
  amount: number;
  amountText: ReturnType<typeof useNativeState<string>>;
  onAmountChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onQuickAmount: (value: number) => void;
  quote: AddMoneyQuote;
  sourceTitle: string;
  sourceSymbol: SFSymbol;
}

function AmountStep({
  amount,
  amountText,
  onAmountChange,
  onBack,
  onContinue,
  onQuickAmount,
  quote,
  sourceTitle,
  sourceSymbol,
}: AmountStepProps) {
  return (
    <FlowAmountEntry
      amount={amount}
      amountText={amountText}
      currencySymbol="₺"
      formatQuickAmount={(value) => formatTry(value, false)}
      isContinueDisabled={amount <= 0}
      onAmountChange={onAmountChange}
      onBack={onBack}
      onContinue={onContinue}
      onQuickAmount={onQuickAmount}
      quickAmounts={quickAddMoneyAmounts}
      selectionSymbol={sourceSymbol}
      selectionTitle={sourceTitle}
      title="Add Money"
      summary={
        <FlowCard height={screenTokens.addMoney.summaryHeight}>
          <VStack
            alignment="leading"
            spacing={9}
            modifiers={[
              padding({ horizontal: screenTokens.addMoney.cardPadding, vertical: 13 }),
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
            ]}
          >
            <Text
              modifiers={[
                font({ size: typography.caption }),
                foregroundStyle(colors.textSecondary),
              ]}
            >
              You’ll receive
            </Text>
            <Text
              modifiers={[
                font({ size: typography.sectionTitle, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {formatUsdc(quote.receivedAmount)}
            </Text>
            <Divider />
            <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
              <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
              <FlowInfoRow label="Time" value={quote.estimatedTime} />
            </HStack>
          </VStack>
        </FlowCard>
      }
    />
  );
}

function ReviewStep({
  onBack,
  onConfirm,
  quote,
}: {
  onBack: () => void;
  onConfirm: () => void;
  quote: AddMoneyQuote;
}) {
  return (
    <FlowStepLayout
      title="Review"
      onBack={onBack}
      primaryLabel="Confirm"
      onPrimaryPress={onConfirm}
    >
      <VStack
        alignment="leading"
        spacing={screenTokens.addMoney.cardGap}
        modifiers={[padding({ top: 24 })]}
      >
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[padding({ all: screenTokens.addMoney.cardPadding })]}
          >
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                  You’re adding
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatTry(quote.amount)}
                </Text>
              </VStack>
              <Spacer />
              <ZStack
                modifiers={[
                  frame({ width: 36, height: 36 }),
                  background(colors.notificationBadge, shapes.circle()),
                ]}
              >
                <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(colors.surface)]}>
                  ₺
                </Text>
              </ZStack>
            </HStack>

            <Divider />

            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                  You’ll receive
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatUsdc(quote.receivedAmount)}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="dollarsign.circle.fill" size={25} color={colors.action} />
            </HStack>

            <Divider />
            <FlowInfoRow
              label="Exchange rate"
              value={`1 USDC ≈ ₺${quote.exchangeRate.toFixed(2)}`}
            />
            <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
            <FlowInfoRow label="Estimated time" value={quote.estimatedTime} />
          </VStack>
        </FlowCard>

        <FlowNotice
          symbol="lock.fill"
          title="Secure & reliable"
          subtitle="Your deposit is processed through regulated partners."
        />
      </VStack>
    </FlowStepLayout>
  );
}

function ProcessingStep({ onBack }: { onBack: () => void }) {
  return (
    <FlowProcessingState
      headerTitle="Adding Money"
      stateTitle="Processing your deposit"
      supportingLines={[
        'This usually takes 1–2 minutes.',
        'We’ll notify you when it’s complete.',
      ]}
      symbol="building.columns.fill"
      steps={[
        { id: 'initiated', title: 'Deposit initiated', subtitle: 'Just now', state: 'complete' },
        {
          id: 'transfer',
          title: 'Processing transfer',
          subtitle: 'This won’t take long',
          state: 'current',
        },
        { id: 'convert', title: 'Converting to USDC', subtitle: 'Next', state: 'pending' },
        { id: 'balance', title: 'Updating your balance', subtitle: 'Final step', state: 'pending' },
      ]}
      noticeTitle="You can close this screen"
      noticeSubtitle="We’ll send you a notification when it’s ready."
      onBack={onBack}
    />
  );
}

function SuccessStep({
  onDone,
  onPutToWork,
  quote,
}: {
  onDone: () => void;
  onPutToWork: () => void;
  quote: AddMoneyQuote;
}) {
  return (
    <FlowSuccessState
      amount={formatTry(quote.amount)}
      noticeSubtitle="Your funds are now in your Trinqa account."
      noticeSymbol="wallet.bifold.fill"
      noticeTitle="Available balance updated"
      onClose={onDone}
      onDone={onDone}
      onSecondaryPress={onPutToWork}
      secondaryLabel="Put it to work"
      supportingText={formatUsdc(quote.receivedAmount)}
      title="Money added"
    />
  );
}

export function AddMoneyFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const sourceId: AddMoneySourceId =
    sourceParam === 'card' || sourceParam === 'wallet' ? sourceParam : 'bank';
  const source = addMoneySources.find((option) => option.id === sourceId) ?? addMoneySources[0];

  const [step, setStep] = useState<AddMoneyStep>('amount');
  const [amount, setAmount] = useState(10000);
  const amountText = useNativeState(formatWholeAmount(10000));
  const quote = useMemo(() => createAddMoneyQuote(amount), [amount]);

  useEffect(() => {
    if (step !== 'processing') return;

    const timer = setTimeout(() => setStep('success'), 2600);
    return () => clearTimeout(timer);
  }, [step]);

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const nextAmount = digits ? Number(digits) : 0;
    const formatted = digits ? formatWholeAmount(nextAmount) : '';

    setAmount(nextAmount);
    if (formatted !== value) amountText.set(formatted);
  };

  const chooseQuickAmount = (value: number) => {
    setAmount(value);
    amountText.set(formatWholeAmount(value));
  };

  const goBack = () => {
    if (step === 'amount') {
      router.back();
      return;
    }

    if (step === 'review') setStep('amount');
    if (step === 'processing') setStep('review');
  };

  const goToWallet = () => router.replace('/pay');
  const goToPutToWork = () =>
    router.push({ pathname: '/put-to-work', params: { origin: 'add-money' } });

  return (
    <FlowScreenShell>
      {step === 'amount' ? (
        <AmountStep
          amount={amount}
          amountText={amountText}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('review')}
          onQuickAmount={chooseQuickAmount}
          quote={quote}
          sourceTitle={source.title}
          sourceSymbol={source.symbol}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep onBack={goBack} onConfirm={() => setStep('processing')} quote={quote} />
      ) : null}

      {step === 'processing' ? <ProcessingStep onBack={goBack} /> : null}

      {step === 'success' ? (
        <SuccessStep onDone={goToWallet} onPutToWork={goToPutToWork} quote={quote} />
      ) : null}
    </FlowScreenShell>
  );
}
