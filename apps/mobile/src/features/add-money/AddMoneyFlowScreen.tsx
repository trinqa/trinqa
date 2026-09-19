import { useMemo, useState } from 'react';

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
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';
import { currencyCapability } from '@/data/capabilities';

import { FlowAmountEntry } from '@/components/FlowAmountEntry';
import { FlowCurrencyMenu } from '@/components/FlowCurrencyMenu';
import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  FlowProcessingState,
  FlowStepLayout,
  FlowSuccessState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { FlowInlineState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import { depositNetworks } from '@/data/capabilities';
import {
  addMoneyCurrencies,
  addMoneySources,
  createAddMoneyQuote,
  quickAddMoneyAmounts,
} from '@/data/mocks/addMoney';
import { formatMoney } from '@/domain/money';
import { recordDeposit } from '@/state/mockAppState';
import { colors, motion, screenTokens, spacing, typography } from '@/theme';
import type { AddMoneyQuote, AddMoneySourceId, AddMoneyStep, CurrencyCode, NetworkCapability } from '@/types';

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface AmountStepProps {
  amount: number;
  amountText: ReturnType<typeof useNativeState<string>>;
  onAmountChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onQuickAmount: (value: number) => void;
  quote: AddMoneyQuote;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
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
  currency,
  onCurrencyChange,
  sourceTitle,
  sourceSymbol,
}: AmountStepProps) {
  return (
    <FlowAmountEntry
      amount={amount}
      amountText={amountText}
      amountAccessory={(
        <FlowCurrencyMenu
          accessibilityName="Deposit currency"
          value={currency}
          options={addMoneyCurrencies}
          onChange={onCurrencyChange}
        />
      )}
      currencySymbol={currencyCapability(currency).symbol}
      formatQuickAmount={(value) => formatMoney(value, currency, { decimals: false })}
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
                font({ size: typography.footnote, weight: 'medium' }),
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
              {formatMoney(quote.receivedAmount, quote.receivedCurrency, { code: true })}
            </Text>
            <Divider />
            <HStack
              spacing={20}
              modifiers={[
                padding({ top: screenTokens.addMoney.summaryDividerToMetadata }),
                frame({ maxWidth: Infinity }),
              ]}
            >
              <FlowInfoRow label="Fee" value={formatMoney(quote.fee, quote.currency)} />
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
  error,
}: {
  onBack: () => void;
  onConfirm: () => void;
  quote: AddMoneyQuote;
  error?: string | null;
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
        modifiers={[padding({ top: spacing.xxxl })]}
      >
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[padding({ all: screenTokens.addMoney.cardPadding })]}
          >
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  You’re adding
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatMoney(quote.amount, quote.currency)}
                </Text>
              </VStack>
              <Spacer />
              <ZStack
                modifiers={[
                  frame({ width: 36, height: 36 }),
                  background(colors.textPrimary, shapes.circle()),
                ]}
              >
                <Text modifiers={[font({ size: typography.caption, weight: 'bold' }), foregroundStyle(colors.surface)]}>
                  ₺
                </Text>
              </ZStack>
            </HStack>

            <Divider />

            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  You’ll receive
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatMoney(quote.receivedAmount, quote.receivedCurrency, { code: true })}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="dollarsign.circle.fill" size={25} color={colors.action} />
            </HStack>

            <Divider />
            <FlowInfoRow label="Destination" value="Available balance" />
            <FlowInfoRow label="Fee" value={formatMoney(quote.fee, quote.currency)} />
            <FlowInfoRow label="Estimated time" value={quote.estimatedTime} />
          </VStack>
        </FlowCard>

        <FlowNotice
          symbol="lock.fill"
          title="Secure & reliable"
          subtitle="Your deposit is processed through the TR mock anchor on Stellar testnet."
        />
        {error ? (
          <FlowInlineState symbol="exclamationmark.circle" title="Deposit failed" subtitle={error} />
        ) : null}
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
        { id: 'convert', title: 'Preparing available balance', subtitle: 'Next', state: 'pending' },
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
      amount={formatMoney(quote.amount, quote.currency)}
      noticeSubtitle="Your funds are now in your Trinqa account."
      noticeSymbol="wallet.bifold.fill"
      noticeTitle="Available balance updated"
      onClose={onDone}
      onDone={onDone}
      onSecondaryPress={onPutToWork}
      secondaryLabel="Put it to work"
      supportingText={formatMoney(quote.receivedAmount, quote.receivedCurrency, { code: true })}
      title="Money added"
    />
  );
}

function NetworkStep({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (network: NetworkCapability) => void;
}) {
  const networks = depositNetworks();
  return (
    <VStack alignment="leading" spacing={0} modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}>
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader showBack title="Source network" onBackPress={onBack} />
      </Group>
      <VStack alignment="leading" spacing={spacing.row} modifiers={[padding({ top: spacing.flowBlock })]}>
        <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
          Stellar is the live deposit network. Other networks are unavailable.
        </Text>
        {networks.map((network) => (
          <Button
            key={network.id}
            onPress={() => onSelect(network)}
            modifiers={[
              buttonStyle('plain'),
              accessibilityLabel(`${network.displayName}, mock supported network`),
              frame({ width: screenTokens.addMoney.contentWidth, height: 60 }),
              background(colors.surface, shapes.roundedRectangle({ cornerRadius: 14 })),
              clipShape('roundedRectangle', 14),
              strokeBorder({ content: colors.borderStrong, style: { lineWidth: 0.5 }, shape: 'roundedRectangle', cornerRadius: 14 }),
            ]}
          >
            <HStack spacing={12} modifiers={[padding({ horizontal: 14 }), frame({ maxWidth: Infinity })]}>
              <Image systemName="network" size={17} color={colors.textPrimary} />
              <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                {network.displayName}
              </Text>
              <Spacer />
              <Image systemName="chevron.right" size={12} color={colors.textSecondary} />
            </HStack>
          </Button>
        ))}
      </VStack>
      <Spacer />
    </VStack>
  );
}

export function AddMoneyFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const sourceId: AddMoneySourceId =
    sourceParam === 'card' || sourceParam === 'wallet' ? sourceParam : 'bank';
  const source = addMoneySources.find((option) => option.id === sourceId) ?? addMoneySources[0];

  const [step, setStep] = useState<AddMoneyStep>(sourceId === 'wallet' ? 'network' : 'amount');
  const [amount, setAmount] = useState(10000);
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const amountText = useNativeState(formatWholeAmount(10000));
  const quote = useMemo(() => createAddMoneyQuote(amount, currency), [amount, currency]);

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
      if (sourceId === 'wallet') setStep('network');
      else router.back();
      return;
    }

    if (step === 'network') router.back();

    if (step === 'review') setStep('amount');
    if (step === 'processing') setStep('review');
  };

  const goToWallet = () => router.replace('/pay');
  const goToPutToWork = () =>
    router.push({ pathname: '/put-to-work', params: { origin: 'add-money' } });

  return (
    <FlowScreenShell>
      {step === 'network' ? (
        <NetworkStep
          onBack={goBack}
          onSelect={() => {
            setStep('amount');
          }}
        />
      ) : null}

      {step === 'amount' ? (
        <AmountStep
          amount={amount}
          amountText={amountText}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('review')}
          onQuickAmount={chooseQuickAmount}
          quote={quote}
          currency={currency}
          onCurrencyChange={setCurrency}
          sourceTitle={source.title}
          sourceSymbol={source.symbol}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          error={submitError}
          onBack={goBack}
          onConfirm={() => {
            setSubmitError(null);
            setStep('processing');
            setTimeout(() => {
              recordDeposit({
                id: `deposit-${Date.now()}`,
                amount,
                creditedAmount: quote.receivedAmount,
                currency,
                source: source.title,
              });
              setStep('success');
            }, motion.duration.flowProcessing);
          }}
          quote={quote}
        />
      ) : null}

      {step === 'processing' ? <ProcessingStep onBack={goBack} /> : null}

      {step === 'success' ? (
        <SuccessStep onDone={goToWallet} onPutToWork={goToPutToWork} quote={quote} />
      ) : null}
    </FlowScreenShell>
  );
}
