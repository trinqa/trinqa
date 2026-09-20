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
  type FlowProcessingRowState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { FlowEmptyState, FlowInlineState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import { depositNetworks } from '@/data/capabilities';
import {
  addMoneyCurrencies,
  addMoneySources,
  quickAddMoneyAmounts,
} from '@/data/mocks/addMoney';
import { formatMoney } from '@/domain/money';
import { errorMessage } from '@/services/apiErrors';
import {
  executeAddMoney,
  quoteAddMoney,
  type AddMoneyLiveQuote,
  type AddMoneyStage,
} from '@/services/flows';
import { useLiveQuote, type LiveQuoteState } from '@/services/useLiveQuote';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';
import type { AddMoneyQuote, AddMoneySourceId, AddMoneyStep, CurrencyCode, NetworkCapability } from '@/types';

/** Maps the anchor's SEP-38 quote onto the review model; USDC is presented as USD across the app. */
function toAddMoneyQuote(amount: number, currency: CurrencyCode, live: AddMoneyLiveQuote | null): AddMoneyQuote {
  if (!live) {
    return { amount, currency, receivedAmount: 0, receivedCurrency: 'USD', exchangeRate: 0, fee: 0, estimatedTime: '—' };
  }
  const price = Number(live.quote.price);
  const feeTotal = Number(live.quote.fee?.total ?? 0);
  const feeInFiat = live.quote.fee?.asset.startsWith('iso4217:') ? feeTotal : feeTotal * price;
  return {
    amount: Number(live.quote.sell_amount),
    currency,
    receivedAmount: Number(live.quote.buy_amount),
    receivedCurrency: 'USD',
    exchangeRate: price,
    fee: feeInFiat,
    estimatedTime: '~1–2 min',
  };
}

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
  quoteState: LiveQuoteState<AddMoneyLiveQuote>;
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
  quoteState,
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
      isContinueDisabled={amount <= 0 || !quoteState.data}
      onAmountChange={onAmountChange}
      onBack={onBack}
      onContinue={onContinue}
      onQuickAmount={onQuickAmount}
      quickAmounts={quickAddMoneyAmounts}
      selectionSymbol={sourceSymbol}
      selectionTitle={sourceTitle}
      title="Add Money"
      summary={
        /* No fee, no “You’ll receive” — just the estimated transfer time. The review shows the live quote. */
        <VStack spacing={spacing.row}>
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={0}
            modifiers={[
              padding({ horizontal: screenTokens.addMoney.cardPadding, vertical: 13 }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            <FlowInfoRow
              label="Time"
              value={quoteState.data ? quote.estimatedTime : quoteState.loading ? 'Getting a live quote…' : '—'}
            />
          </VStack>
        </FlowCard>
        {quoteState.error ? (
          <FlowInlineState
            symbol="exclamationmark.circle"
            tone="danger"
            title="Can’t quote this amount"
            subtitle={quoteState.error}
            onRetry={quoteState.retry}
          />
        ) : null}
        </VStack>
      }
    />
  );
}

function ReviewStep({
  onBack,
  onConfirm,
  quote,
  error,
  isQuoteReady,
  isSubmitting,
}: {
  onBack: () => void;
  onConfirm: () => void;
  quote: AddMoneyQuote;
  error?: string | null;
  isQuoteReady: boolean;
  isSubmitting: boolean;
}) {
  return (
    <FlowStepLayout
      title="Review"
      onBack={onBack}
      primaryLabel="Confirm"
      onPrimaryPress={onConfirm}
      isPrimaryDisabled={!isQuoteReady}
      isPrimaryBusy={isSubmitting}
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
                <Text modifiers={[font({ size: typography.caption, weight: 'bold' }), foregroundStyle(colors.textInverse)]}>
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
            {quote.exchangeRate > 0 ? (
              <FlowInfoRow label="Exchange rate" value={`1 $ ≈ ${formatMoney(quote.exchangeRate, quote.currency)}`} />
            ) : null}
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
          <FlowInlineState symbol="exclamationmark.circle" tone="danger" title="Deposit failed" subtitle={error} />
        ) : null}
      </VStack>
    </FlowStepLayout>
  );
}

const ADD_MONEY_STAGE_ORDER: AddMoneyStage[] = ['initiated', 'transfer', 'convert', 'balance'];

function stageRowState(current: AddMoneyStage, row: AddMoneyStage): FlowProcessingRowState {
  const currentIndex = ADD_MONEY_STAGE_ORDER.indexOf(current);
  const rowIndex = ADD_MONEY_STAGE_ORDER.indexOf(row);
  if (rowIndex < currentIndex) return 'complete';
  if (rowIndex === currentIndex) return 'current';
  return 'pending';
}

function ProcessingStep({ stage }: { stage: AddMoneyStage }) {
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
        {
          id: 'initiated',
          title: 'Deposit initiated',
          subtitle: 'Just now',
          state: stageRowState(stage, 'initiated'),
        },
        {
          id: 'transfer',
          title: 'Processing transfer',
          subtitle: 'This won’t take long',
          state: stageRowState(stage, 'transfer'),
        },
        {
          id: 'convert',
          title: 'Preparing available balance',
          subtitle: 'Waiting on the anchor',
          state: stageRowState(stage, 'convert'),
        },
        {
          id: 'balance',
          title: 'Updating your balance',
          subtitle: 'Final step',
          state: stageRowState(stage, 'balance'),
        },
      ]}
      noticeTitle="Keep this screen open"
      noticeSubtitle="We’ll move you on as soon as the anchor confirms."
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
        {networks.length === 0 ? (
          <FlowEmptyState
            title="No deposit networks"
            subtitle="Crypto deposits are switched off for this account right now."
          />
        ) : null}
        {networks.map((network) => (
          <Button
            key={network.id}
            onPress={() => onSelect(network)}
            modifiers={[
              buttonStyle('plain'),
              ...hitTargetModifiers({
                label: `${network.displayName}, mock supported network`,
                shape: 'roundedRectangle',
                cornerRadius: componentTokens.surface.cardRadius,
              }),
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
  const { account } = useMockAppState();
  const params = useLocalSearchParams<{ source?: string }>();
  const sourceParam = Array.isArray(params.source) ? params.source[0] : params.source;
  const sourceId: AddMoneySourceId =
    sourceParam === 'card' || sourceParam === 'wallet' ? sourceParam : 'bank';
  const source = addMoneySources.find((option) => option.id === sourceId) ?? addMoneySources[0];

  const [step, setStep] = useState<AddMoneyStep>(sourceId === 'wallet' ? 'network' : 'amount');
  const [amount, setAmount] = useState(10000);
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<AddMoneyStage>('initiated');
  const amountText = useNativeState(formatWholeAmount(10000));
  const liveQuote = useLiveQuote(
    `${sourceId}:${currency}:${amount}`,
    amount > 0,
    () => quoteAddMoney({ amount, currency, sourceId }),
  );
  const quote = useMemo(() => toAddMoneyQuote(amount, currency, liveQuote.data), [amount, currency, liveQuote.data]);

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
    // 'processing' has no back: the deposit is already in flight.
  };

  const goToWallet = () => router.replace('/');
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
          quoteState={liveQuote}
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
          isQuoteReady={Boolean(liveQuote.data)}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            const live = liveQuote.data;
            if (!live || isSubmitting) return;
            setSubmitError(null);
            setIsSubmitting(true);
            setStage('initiated');
            setStep('processing');
            void (async () => {
              try {
                await executeAddMoney({
                  accountId: account.id,
                  live,
                  amount,
                  currency,
                  sourceId,
                  onStage: setStage,
                });
                setStep('success');
              } catch (err) {
                setSubmitError(errorMessage(err));
                setStep('review');
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}
          quote={quote}
        />
      ) : null}

      {step === 'processing' ? <ProcessingStep stage={stage} /> : null}

      {step === 'success' ? (
        <SuccessStep onDone={goToWallet} onPutToWork={goToPutToWork} quote={quote} />
      ) : null}
    </FlowScreenShell>
  );
}
