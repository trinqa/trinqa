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
  contentShape,
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
  FlowProcessingState,
  FlowStepLayout,
  FlowSuccessState,
  type FlowProcessingRowState,
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
import { BackendApiError, errorMessage } from '@/services/apiErrors';
import { executePutToWork, type PutToWorkStage } from '@/services/flows';
import { earnUnavailable, earnUnavailableReason } from '@/services/session';
import { useMockAppState } from '@/state/mockAppState';
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

interface FlowFailure {
  title: string;
  subtitle: string;
}

/**
 * The title separates the three outcomes the user can act on differently: their own plan
 * refused the move, the check could not run at all, or something else broke.
 */
function toFlowFailure(err: unknown): FlowFailure {
  const subtitle = errorMessage(err);
  if (err instanceof BackendApiError && err.code === 'POLICY_DENIED') {
    return { title: 'Your plan did not allow this', subtitle };
  }
  if (err instanceof BackendApiError && err.code === 'ADAPTER_UNAVAILABLE') {
    return { title: 'Not available right now', subtitle };
  }
  return { title: 'Could not complete', subtitle };
}

function formatWholeAmount(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatUsd(value: number, decimals = true) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })} $`;
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
          `${profile.title}, ${profile.riskLabel}, ${profile.estimatedApy.toFixed(1)} percent yearly return`,
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
          // The row's fill sits on the Button, not on this label, so without a hit shape
          // only the text and the checkmark answer a tap — not the padding or the Spacer.
          contentShape(shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius })),
        ]}
      >
        <VStack alignment="leading" spacing={3}>
          <HStack spacing={6}>
            <Text
              modifiers={[
                font({ size: typography.label, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {profile.title}
            </Text>
            {selected ? (
              <Image systemName="checkmark.circle.fill" size={14} color={colors.action} />
            ) : null}
          </HStack>
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {profile.riskLabel}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={3}>
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            Yearly return
          </Text>
          <Text
            modifiers={[
              font({ size: typography.label, weight: 'semibold' }),
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
  amount,
  horizon,
  onBack,
  onContinue,
  onHorizonChange,
  onProfileChange,
  profile,
  targetDate,
  onTargetDateChange,
}: {
  amount: number;
  horizon: PutToWorkHorizon;
  onBack: () => void;
  onContinue: () => void;
  onHorizonChange: (horizon: PutToWorkHorizonId) => void;
  onProfileChange: (profile: PutToWorkRiskId) => void;
  profile: PutToWorkRiskProfile;
  targetDate: Date;
  onTargetDateChange: (date: Date) => void;
}) {
  const flow = screenTokens.putToWork;

  return (
    <FlowStepLayout
      title="Grow money"
      onBack={onBack}
      primaryLabel="Continue"
      onPrimaryPress={onContinue}
    >
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[padding({ top: flow.headerToContent }), frame({ width: flow.contentWidth })]}
      >
        <Text modifiers={[font({ size: typography.body, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
          Choose how this money should grow.
        </Text>
        <Text
          modifiers={[
            padding({ top: 4 }),
            font({ size: typography.footnote, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          Setting aside {formatUsd(amount)}
        </Text>

        <Text
          modifiers={[
            padding({ top: 16 }),
            font({ size: typography.kicker, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Pick a plan
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
            font({ size: typography.kicker, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          How long can it stay?
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
            font({ size: typography.footnote, weight: 'medium' }),
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

/** Caption shown on the amount step (first step). Horizon is not chosen yet so
 *  no yield estimates — just the spendable ceiling and an "already growing" hint. */
function AvailableCaption({ available, earning }: { available: number; earning: number }) {
  return (
    <FlowCard>
      <VStack
        alignment="leading"
        spacing={5}
        modifiers={[
          padding({ horizontal: screenTokens.putToWork.cardPadding, vertical: 11 }),
          frame({ maxWidth: Infinity }),
        ]}
      >
        <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text
            modifiers={[
              font({ size: typography.footnote, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            Ready to use
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: typography.label, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {formatUsd(available)}
          </Text>
        </HStack>
        {earning > 0 ? (
          <Text
            modifiers={[
              font({ size: typography.footnote, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {formatUsd(earning)} already growing · this adds more
          </Text>
        ) : null}
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
  isSubmitting,
}: {
  horizon: PutToWorkHorizon;
  onBack: () => void;
  onConfirm: () => void;
  profile: PutToWorkRiskProfile;
  quote: PutToWorkQuote;
  error?: FlowFailure | null;
  earnBlockedReason?: string | null;
  isSubmitting: boolean;
}) {
  return (
    <FlowStepLayout
      title="Review"
      onBack={onBack}
      primaryLabel="Confirm"
      onPrimaryPress={onConfirm}
      isPrimaryBusy={isSubmitting}
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
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  Setting aside
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
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
                  Moving to grow
                </Text>
                <Text
                  modifiers={[
                    font({ size: typography.label, weight: 'semibold' }),
                    foregroundStyle(colors.textPrimary),
                  ]}
                >
                  {profile.title} · {profile.estimatedApy.toFixed(1)}% yearly return
                </Text>
              </VStack>
            </HStack>

            <Divider />
            <FlowInfoRow label="Ready to use after" value={formatUsd(quote.availableAfter)} />
            <FlowInfoRow label="Growing after" value={formatUsd(quote.earningAfter)} />
            <FlowInfoRow label="When you can use it" value={horizon.accessLabel} />
            <FlowInfoRow label="How risky" value={profile.reviewRiskLabel} />
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
          <FlowInlineState symbol="exclamationmark.circle" tone="danger" title={error.title} subtitle={error.subtitle} />
        ) : null}
        <StrategyDetailsSheet profile={profile} />
      </VStack>
    </FlowStepLayout>
  );
}

const PUT_TO_WORK_STAGE_ORDER: PutToWorkStage[] = ['policy', 'depositing', 'completed'];

function putToWorkRowState(current: PutToWorkStage, row: PutToWorkStage): FlowProcessingRowState {
  const currentIndex = PUT_TO_WORK_STAGE_ORDER.indexOf(current);
  const rowIndex = PUT_TO_WORK_STAGE_ORDER.indexOf(row);
  if (rowIndex < currentIndex) return 'complete';
  if (rowIndex === currentIndex) return 'current';
  return 'pending';
}

export function PutToWorkFlowScreen() {
  const router = useRouter();
  const { account, balances, capabilities } = useMockAppState();
  const params = useLocalSearchParams<{ origin?: string }>();
  const originParam = Array.isArray(params.origin) ? params.origin[0] : params.origin;
  const origin: PutToWorkOrigin =
    originParam === 'add-money' || originParam === 'earn' ? originParam : 'wallet';

  const [step, setStep] = useState<PutToWorkStep>('amount');
  const [profileId, setProfileId] = useState<PutToWorkRiskId>('balanced');
  const [horizonId, setHorizonId] = useState<PutToWorkHorizonId>('anytime');
  const [amount, setAmount] = useState(1);
  const [targetDate, setTargetDate] = useState(new Date(2026, 9, 25));
  const [submitError, setSubmitError] = useState<FlowFailure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<PutToWorkStage>('policy');
  const [deposited, setDeposited] = useState(true);
  const amountText = useNativeState(formatWholeAmount(1));
  const blockedReason = earnUnavailable(capabilities) ? earnUnavailableReason(capabilities) : null;

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
    if (step === 'amount') {
      router.back();
      return;
    }
    if (step === 'strategy') setStep('amount');
    if (step === 'review') setStep('strategy');
  };

  const finish = () => router.replace(origin === 'earn' ? '/earn' : '/pay');
  const viewEarn = () => router.replace('/earn');

  return (
    <FlowScreenShell>
      {step === 'amount' ? (
        <FlowAmountEntry
          amount={amount}
          amountText={amountText}
          currencySymbol="$"
          formatQuickAmount={(value) => formatUsd(value, false)}
          isContinueDisabled={amount <= 0 || amount > balances.available}
          onAmountChange={updateAmount}
          onBack={goBack}
          onContinue={() => setStep('strategy')}
          onQuickAmount={chooseQuickAmount}
          quickAmounts={quickPutToWorkAmounts}
          selectionSymbol="wallet.bifold.fill"
          selectionTitle="From ready to use"
          summary={<AvailableCaption available={balances.available} earning={balances.earning} />}
          title="Grow money"
        />
      ) : null}

      {step === 'strategy' ? (
        <StrategyStep
          amount={amount}
          horizon={horizon}
          onBack={goBack}
          onContinue={() => setStep('review')}
          onHorizonChange={setHorizonId}
          onProfileChange={setProfileId}
          profile={profile}
          targetDate={targetDate}
          onTargetDateChange={setTargetDate}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          earnBlockedReason={blockedReason}
          error={submitError}
          horizon={horizon}
          isSubmitting={isSubmitting}
          onBack={goBack}
          onConfirm={() => {
            if (isSubmitting) return;
            setSubmitError(null);
            setIsSubmitting(true);
            setStage('policy');
            setStep('processing');
            void (async () => {
              try {
                const result = await executePutToWork({
                  accountId: account.id,
                  amount,
                  risk: profile.id,
                  horizon: horizon.id,
                  targetDate,
                  capabilities,
                  onStage: setStage,
                });
                setDeposited(result.deposited);
                setStep('success');
              } catch (err) {
                setSubmitError(toFlowFailure(err));
                setStep('review');
              } finally {
                setIsSubmitting(false);
              }
            })();
          }}
          profile={profile}
          quote={quote}
        />
      ) : null}

      {step === 'processing' ? (
        <FlowProcessingState
          headerTitle="Grow money"
          stateTitle="Setting your money to grow"
          supportingLines={['Signing your plan and moving the funds.']}
          symbol="chart.line.uptrend.xyaxis"
          steps={[
            {
              id: 'policy',
              title: 'Saving your plan',
              subtitle: 'Signing the policy',
              state: putToWorkRowState(stage, 'policy'),
            },
            {
              id: 'depositing',
              title: 'Moving money into the strategy',
              subtitle: profile.title,
              state: putToWorkRowState(stage, 'depositing'),
            },
            {
              id: 'completed',
              title: 'Updating your balance',
              subtitle: 'Final step',
              state: putToWorkRowState(stage, 'completed'),
            },
          ]}
          noticeTitle="Keep this screen open"
          noticeSubtitle="We’ll move you on as soon as it’s set."
        />
      ) : null}

      {step === 'success' ? (
        <FlowSuccessState
          amount={formatUsd(quote.amount)}
          noticeSubtitle={
            deposited
              ? 'That money is now set aside to grow.'
              : 'Your plan was saved. Growing money is unavailable until the yield provider is configured.'
          }
          noticeSymbol="chart.line.uptrend.xyaxis"
          noticeTitle={deposited ? 'Growing money updated' : 'Plan saved'}
          onClose={finish}
          onDone={finish}
          onSecondaryPress={viewEarn}
          secondaryLabel="See growing money"
          supportingText={`${profile.title} · ${profile.estimatedApy.toFixed(1)}% yearly return`}
          title="Money is set aside to grow"
        />
      ) : null}
    </FlowScreenShell>
  );
}
