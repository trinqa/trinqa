import { useMemo, useState } from 'react';

import {
  Button,
  DatePicker,
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
  accessibilityAddTraits,
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
  datePickerStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FlowAmountEntry } from '@/components/FlowAmountEntry';
import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  FlowStepLayout,
  FlowSuccessState,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { FlowInlineState } from '@/components/FlowStates';
import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { StrategyDetailsSheet } from '@/components/StrategyDetailsSheet';
import {
  createPutToWorkQuote,
  putToWorkHorizons,
  putToWorkRiskProfiles,
  quickPutToWorkAmounts,
} from '@/data/mocks/putToWork';
import { recordAllocation, useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import type {
  PutToWorkHorizon,
  PutToWorkHorizonId,
  PutToWorkOrigin,
  PutToWorkQuote,
  PutToWorkRiskId,
  PutToWorkRiskProfile,
  PutToWorkStep,
} from '@/types';

const HORIZON_OPTIONS = putToWorkHorizons.map((horizon) => ({
  label: horizon.title,
  value: horizon.id,
}));

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatUsd(value: number, decimals = true) {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}

function StrategyOption({
  profile,
  selected,
  onPress,
}: {
  profile: PutToWorkRiskProfile;
  selected: boolean;
  onPress: () => void;
}) {
  const flow = screenTokens.putToWork;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(
          `${profile.title}, ${profile.riskLabel}, ${profile.estimatedApy.toFixed(1)} percent estimated APY`,
        ),
        ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
        frame({ width: flow.contentWidth, height: flow.strategyRowHeight }),
        background(
          selected ? colors.selection : colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
        ),
        clipShape('roundedRectangle', componentTokens.surface.cardRadius),
        strokeBorder({
          content: selected ? colors.action : colors.borderStrong,
          style: { lineWidth: selected ? 1 : componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.cardRadius,
        }),
      ]}
    >
      <HStack
        alignment="center"
        spacing={10}
        modifiers={[
          padding({ horizontal: 14 }),
          frame({ width: flow.contentWidth, height: flow.strategyRowHeight }),
        ]}
      >
        <VStack alignment="leading" spacing={3}>
          <HStack spacing={6}>
            <Text
              modifiers={[
                font({ size: typography.body, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {profile.title}
            </Text>
            {selected ? (
              <Image systemName="checkmark.circle.fill" size={14} color={colors.action} />
            ) : null}
          </HStack>
          <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
            {profile.riskLabel}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={3}>
          <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
            Estimated APY
          </Text>
          <Text
            modifiers={[
              font({ size: typography.body, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {profile.estimatedApy.toFixed(1)}%
          </Text>
        </VStack>
      </HStack>
    </Button>
  );
}

function StrategyStep({
  horizon,
  onBack,
  onContinue,
  onHorizonChange,
  onProfileChange,
  profile,
  targetDate,
  onTargetDateChange,
  availableAmount,
}: {
  horizon: PutToWorkHorizon;
  onBack: () => void;
  onContinue: () => void;
  onHorizonChange: (horizon: PutToWorkHorizonId) => void;
  onProfileChange: (profile: PutToWorkRiskId) => void;
  profile: PutToWorkRiskProfile;
  targetDate: Date;
  onTargetDateChange: (date: Date) => void;
  availableAmount: number;
}) {
  const flow = screenTokens.putToWork;

  return (
    <FlowStepLayout
      title="Put it to work"
      onBack={onBack}
      primaryLabel="Continue"
      onPrimaryPress={onContinue}
    >
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ top: flow.headerToContent }), frame({ width: flow.contentWidth })]}
      >
        <Text modifiers={[font({ size: typography.body }), foregroundStyle(colors.textSecondary)]}>
          Choose how your available money should earn.
        </Text>

        <Group modifiers={[padding({ top: 12 })]}>
          <FlowCard height={flow.availableHeight}>
            <HStack
              alignment="center"
              spacing={12}
              modifiers={[
                padding({ horizontal: flow.cardPadding }),
                frame({ maxWidth: Infinity, maxHeight: Infinity }),
              ]}
            >
              <VStack alignment="leading" spacing={3}>
                <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
                  Available to allocate
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatUsd(availableAmount)}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="wallet.bifold.fill" size={20} color={colors.textPrimary} />
            </HStack>
          </FlowCard>
        </Group>

        <Text
          modifiers={[
            padding({ top: 16 }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Strategy
        </Text>
        <VStack spacing={flow.strategyGap} modifiers={[padding({ top: 8 })]}>
          {putToWorkRiskProfiles.map((option) => (
            <StrategyOption
              key={option.id}
              profile={option}
              selected={option.id === profile.id}
              onPress={() => onProfileChange(option.id)}
            />
          ))}
        </VStack>

        <Text
          modifiers={[
            padding({ top: flow.horizonTopGap }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Time horizon
        </Text>
        <Group modifiers={[padding({ top: 8 })]}>
          <NativeSegmentedControl
            accessibilityLabel="Time horizon"
            value={horizon.id}
            onChange={onHorizonChange}
            options={HORIZON_OPTIONS}
            width={flow.contentWidth}
            height={flow.horizonHeight}
          />
        </Group>
        <Text
          modifiers={[
            padding({ top: 7, horizontal: 2 }),
            font({ size: typography.footnote }),
            foregroundStyle(colors.textSecondary),
            frame({ width: flow.contentWidth, height: flow.explanationHeight, alignment: 'topLeading' }),
          ]}
        >
          {horizon.explanation}
        </Text>
        {horizon.id === 'date' ? (
          <DatePicker
            title="Target date"
            selection={targetDate}
            displayedComponents={['date']}
            range={{ start: new Date(), end: new Date(2028, 11, 31) }}
            onDateChange={onTargetDateChange}
            modifiers={[datePickerStyle('compact'), frame({ width: flow.contentWidth, height: componentTokens.headerControl.size })]}
          />
        ) : null}
      </VStack>
    </FlowStepLayout>
  );
}

function AmountSummary({
  horizon,
  quote,
}: {
  horizon: PutToWorkHorizon;
  quote: PutToWorkQuote;
}) {
  return (
    <FlowCard height={screenTokens.putToWork.summaryHeight}>
      <VStack
        alignment="leading"
        spacing={9}
        modifiers={[
          padding({ horizontal: screenTokens.putToWork.cardPadding, vertical: 13 }),
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
        ]}
      >
        <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
          You’ll add to earning
        </Text>
        <Text
          modifiers={[
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          ≈ {formatUsd(quote.amount)}
        </Text>
        <Divider />
        <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
          <FlowInfoRow
            label="Est. yearly"
            value={`~${formatUsd(quote.estimatedYearlyReturn)}`}
          />
          <FlowInfoRow label="Access" value={horizon.accessLabel} />
        </HStack>
      </VStack>
    </FlowCard>
  );
}

function ReviewStep({
  horizon,
  onBack,
  onConfirm,
  profile,
  quote,
  error,
  earnBlockedReason,
}: {
  horizon: PutToWorkHorizon;
  onBack: () => void;
  onConfirm: () => void;
  profile: PutToWorkRiskProfile;
  quote: PutToWorkQuote;
  error?: string | null;
  earnBlockedReason?: string | null;
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
        spacing={screenTokens.putToWork.cardGap}
        modifiers={[padding({ top: spacing.xxxl })]}
      >
        <FlowCard>
          <VStack
            alignment="leading"
            spacing={12}
            modifiers={[padding({ all: screenTokens.putToWork.cardPadding })]}
          >
            <HStack
              alignment="center"
              spacing={12}
              modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
            >
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
                  You’re allocating
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.sectionTitle, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {formatUsd(quote.amount)}
                </Text>
              </VStack>
              <Spacer />
              <ZStack
                modifiers={[
                  frame({ width: 36, height: 36 }),
                  background(colors.successMuted, shapes.circle()),
                ]}
              >
                <Image systemName="chart.line.uptrend.xyaxis" size={17} color={colors.success} />
              </ZStack>
            </HStack>

            <Divider />

            <HStack
              alignment="center"
              spacing={12}
              modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
            >
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
                  To earning
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.body, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {profile.title} · {profile.estimatedApy.toFixed(1)}% estimated APY
                </Text>
              </VStack>
            </HStack>

            <Divider />
            <FlowInfoRow label="Available after" value={formatUsd(quote.availableAfter)} />
            <FlowInfoRow label="Earning after" value={formatUsd(quote.earningAfter)} />
            <FlowInfoRow label="Access" value={horizon.accessLabel} />
            <FlowInfoRow label="Risk" value={profile.reviewRiskLabel} />
          </VStack>
        </FlowCard>

        <FlowNotice
          symbol="arrow.left.arrow.right"
          title={earnBlockedReason ? 'Policy only' : 'Flexible access'}
          subtitle={
            earnBlockedReason
              ?? 'You can move money back to available whenever needed.'
          }
        />
        {error ? (
          <FlowInlineState symbol="exclamationmark.circle" title="Could not complete" subtitle={error} />
        ) : null}
        <StrategyDetailsSheet profile={profile} />
      </VStack>
    </FlowStepLayout>
  );
}

export function PutToWorkFlowScreen() {
  const router = useRouter();
  const { balances } = useMockAppState();
  const params = useLocalSearchParams<{ origin?: string }>();
  const originParam = Array.isArray(params.origin) ? params.origin[0] : params.origin;
  const origin: PutToWorkOrigin =
    originParam === 'add-money' || originParam === 'earn' ? originParam : 'wallet';

  const [step, setStep] = useState<PutToWorkStep>('strategy');
  const [profileId, setProfileId] = useState<PutToWorkRiskId>('balanced');
  const [horizonId, setHorizonId] = useState<PutToWorkHorizonId>('anytime');
  const [amount, setAmount] = useState(1);
  const [targetDate, setTargetDate] = useState(new Date(2026, 9, 25));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const amountText = useNativeState(formatWholeAmount(1));

  const profile =
    putToWorkRiskProfiles.find((option) => option.id === profileId) ?? putToWorkRiskProfiles[1];
  const horizon =
    putToWorkHorizons.find((option) => option.id === horizonId) ?? putToWorkHorizons[0];
  const quote = useMemo(() => createPutToWorkQuote(amount, profile, balances), [amount, balances, profile]);

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 7);
    const requestedAmount = digits ? Number(digits) : 0;
    const nextAmount = Math.min(requestedAmount, Math.floor(balances.available));
    const formatted = nextAmount ? formatWholeAmount(nextAmount) : '';

    setAmount(nextAmount);
    if (formatted !== value) amountText.set(formatted);
  };

  const chooseQuickAmount = (value: number) => {
    const nextAmount = Math.min(value, Math.floor(balances.available));
    setAmount(nextAmount);
    amountText.set(formatWholeAmount(nextAmount));
  };

  const goBack = () => {
    if (step === 'strategy') {
      router.back();
      return;
    }
    if (step === 'amount') setStep('strategy');
    if (step === 'review') setStep('amount');
  };

  const finish = () => router.replace(origin === 'earn' ? '/earn' : '/pay');
  const viewEarn = () => router.replace('/earn');

  return (
    <FlowScreenShell>
      {step === 'strategy' ? (
        <StrategyStep
          horizon={horizon}
          onBack={goBack}
          onContinue={() => setStep('amount')}
          onHorizonChange={setHorizonId}
          onProfileChange={setProfileId}
          profile={profile}
          targetDate={targetDate}
          onTargetDateChange={setTargetDate}
          availableAmount={balances.available}
        />
      ) : null}

      {step === 'amount' ? (
        <FlowAmountEntry
          amount={amount}
          amountText={amountText}
          currencySymbol="$"
          formatQuickAmount={(value) => formatUsd(value, false)}
          isContinueDisabled={amount <= 0 || amount > balances.available}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('review')}
          onQuickAmount={chooseQuickAmount}
          quickAmounts={quickPutToWorkAmounts}
          selectionSymbol="chart.line.uptrend.xyaxis"
          selectionTitle={profile.title}
          summary={<AmountSummary horizon={horizon} quote={quote} />}
          title="Put it to work"
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          earnBlockedReason={null}
          error={submitError}
          horizon={horizon}
          onBack={goBack}
          onConfirm={() => {
            setSubmitError(null);
            recordAllocation({
              id: `earn-${Date.now()}`,
              amountTry: quote.amount,
              risk: profile.id,
              timeHorizon: {
                kind: horizon.id,
                targetDate: horizon.id === 'date' ? targetDate.toISOString() : undefined,
              },
            });
            setStep('success');
          }}
          profile={profile}
          quote={quote}
        />
      ) : null}

      {step === 'success' ? (
        <FlowSuccessState
          amount={formatUsd(quote.amount)}
          noticeSubtitle="Your funds are now working in your Trinqa Earn balance."
          noticeSymbol="chart.line.uptrend.xyaxis"
          noticeTitle="Earning balance updated"
          onClose={finish}
          onDone={finish}
          onSecondaryPress={viewEarn}
          secondaryLabel="View Earn"
          supportingText={`${profile.title} · ${profile.estimatedApy.toFixed(1)}% estimated APY`}
          title="Money put to work"
        />
      ) : null}
    </FlowScreenShell>
  );
}
