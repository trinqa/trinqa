import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  Divider,
  Group,
  Host,
  HStack,
  Image,
  ProgressView,
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
  controlSize,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  labelStyle,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  scaleEffect,
  shapes,
  strokeBorder,
  textFieldStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import {
  FlowCard,
  FlowInfoRow,
  FlowNotice,
  PrimaryActionButton,
  SecondaryActionButton,
} from '@/components/FlowControls';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  addMoneySources,
  createAddMoneyQuote,
  quickAddMoneyAmounts,
} from '@/data/mocks/addMoney';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
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

function FlowShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Host style={styles.host} useViewportSizeMeasurement>
          <VStack
            alignment="leading"
            spacing={0}
            modifiers={[
              padding({ top: spacing.headerTop, bottom: spacing.md, horizontal: spacing.screenHorizontal }),
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
              background(colors.background),
            ]}
          >
            {children}
          </VStack>
        </Host>
      </SafeAreaView>
    </View>
  );
}

function MethodBadge({ title, symbol }: { title: string; symbol: SFSymbol }) {
  return (
    <HStack
      alignment="center"
      spacing={8}
      modifiers={[
        padding({ horizontal: 12 }),
        frame({ height: screenTokens.addMoney.methodHeight }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius })),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.controlRadius,
        }),
      ]}
    >
      <Image systemName={symbol} size={14} color={colors.textPrimary} />
      <Text modifiers={[font({ size: typography.caption, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
        {title}
      </Text>
    </HStack>
  );
}

function QuickAmountButton({
  amount,
  selected,
  onPress,
}: {
  amount: number;
  selected: boolean;
  onPress: () => void;
}) {
  const buttonWidth =
    (screenTokens.addMoney.contentWidth - screenTokens.addMoney.quickAmountGap * 2) / 3;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`Set amount to ${formatTry(amount, false)}`),
        frame({ width: buttonWidth, height: screenTokens.addMoney.quickAmountHeight }),
        background(
          selected ? colors.accentMuted : colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
        ),
        clipShape('roundedRectangle', componentTokens.surface.controlRadius),
        strokeBorder({
          content: selected ? colors.action : colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.controlRadius,
        }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: typography.caption, weight: selected ? 'semibold' : 'medium' }),
          foregroundStyle(selected ? colors.action : colors.textPrimary),
        ]}
      >
        {formatTry(amount, false)}
      </Text>
    </Button>
  );
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
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Add Money" onBackPress={onBack} />
      </Group>

      <VStack
        alignment="center"
        spacing={0}
        modifiers={[padding({ top: screenTokens.addMoney.headerToContent }), frame({ maxWidth: Infinity })]}
      >
        <MethodBadge title={sourceTitle} symbol={sourceSymbol} />

        <HStack
          alignment="firstTextBaseline"
          spacing={4}
          modifiers={[
            padding({ top: screenTokens.addMoney.amountTopGap }),
            frame({ width: screenTokens.addMoney.contentWidth, height: screenTokens.addMoney.amountFieldHeight }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.balanceMedium, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            ₺
          </Text>
          <TextField
            autoFocus
            maxLength={13}
            text={amountText}
            onTextChange={onAmountChange}
            modifiers={[
              textFieldStyle('plain'),
              keyboardType('numeric'),
              multilineTextAlignment('center'),
              monospacedDigit(),
              font({ size: typography.balanceLarge, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
              frame({ width: 270, height: screenTokens.addMoney.amountFieldHeight }),
            ]}
          />
        </HStack>

        <HStack spacing={screenTokens.addMoney.quickAmountGap} modifiers={[padding({ top: 12 })]}>
          {quickAddMoneyAmounts.map((quickAmount) => (
            <QuickAmountButton
              key={quickAmount}
              amount={quickAmount}
              selected={amount === quickAmount}
              onPress={() => onQuickAmount(quickAmount)}
            />
          ))}
        </HStack>

        <Group modifiers={[padding({ top: screenTokens.addMoney.summaryTopGap })]}>
          <FlowCard height={screenTokens.addMoney.summaryHeight}>
            <VStack
              alignment="leading"
              spacing={9}
              modifiers={[
                padding({ horizontal: screenTokens.addMoney.cardPadding, vertical: 13 }),
                frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }),
              ]}
            >
              <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                You’ll receive
              </Text>
              <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                {formatUsdc(quote.receivedAmount)}
              </Text>
              <Divider />
              <HStack spacing={20} modifiers={[frame({ maxWidth: Infinity })]}>
                <FlowInfoRow label="Fee" value={formatTry(quote.fee)} />
                <FlowInfoRow label="Time" value={quote.estimatedTime} />
              </HStack>
            </VStack>
          </FlowCard>
        </Group>
      </VStack>

      <Spacer />
      <PrimaryActionButton label="Continue" onPress={onContinue} isDisabled={amount <= 0} />
    </VStack>
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
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Review" onBackPress={onBack} />
      </Group>

      <VStack alignment="leading" spacing={screenTokens.addMoney.cardGap} modifiers={[padding({ top: 24 })]}>
        <FlowCard>
          <VStack alignment="leading" spacing={12} modifiers={[padding({ all: screenTokens.addMoney.cardPadding })]}>
            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                  You’re adding
                </Text>
                <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
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
                <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(colors.surface)]}>₺</Text>
              </ZStack>
            </HStack>

            <Divider />

            <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
              <VStack alignment="leading" spacing={4}>
                <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                  You’ll receive
                </Text>
                <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                  {formatUsdc(quote.receivedAmount)}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="dollarsign.circle.fill" size={25} color={colors.action} />
            </HStack>

            <Divider />
            <FlowInfoRow label="Exchange rate" value={`1 USDC ≈ ₺${quote.exchangeRate.toFixed(2)}`} />
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

      <Spacer />
      <PrimaryActionButton label="Confirm" onPress={onConfirm} />
    </VStack>
  );
}

function ProcessingTimelineRow({
  title,
  subtitle,
  state,
}: {
  title: string;
  subtitle: string;
  state: 'complete' | 'current' | 'pending';
}) {
  const symbol = state === 'complete' ? 'checkmark.circle.fill' : 'circle';
  const color = state === 'pending' ? colors.borderStrong : colors.action;

  return (
    <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity, minHeight: 52 })]}>
      <Image systemName={symbol} size={18} color={color} />
      <VStack alignment="leading" spacing={3}>
        <Text
          modifiers={[
            font({ size: typography.caption, weight: 'medium' }),
            foregroundStyle(state === 'pending' ? colors.textSecondary : colors.textPrimary),
          ]}
        >
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      </VStack>
    </HStack>
  );
}

function ProcessingStep({ onBack }: { onBack: () => void }) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Adding Money" onBackPress={onBack} />
      </Group>

      <VStack alignment="center" spacing={0} modifiers={[padding({ top: 34 }), frame({ maxWidth: Infinity })]}>
        <ZStack
          modifiers={[
            frame({ width: screenTokens.addMoney.processingIconSize, height: screenTokens.addMoney.processingIconSize }),
            background(colors.surface, shapes.circle()),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'circle',
            }),
          ]}
        >
          <ProgressView
            value={0.68}
            modifiers={[
              progressViewStyle('circular'),
              controlSize('extraLarge'),
              tint(colors.action),
              scaleEffect(1.65),
            ]}
          />
          <Image systemName="building.columns.fill" size={19} color={colors.textPrimary} />
        </ZStack>

        <Text
          modifiers={[
            padding({ top: 28 }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Processing your deposit
        </Text>
        <Text
          modifiers={[
            padding({ top: 8 }),
            font({ size: typography.caption }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          This usually takes 1–2 minutes.
        </Text>
        <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
          We’ll notify you when it’s complete.
        </Text>

        <VStack alignment="leading" spacing={2} modifiers={[padding({ top: 24 }), frame({ width: 300 })]}>
          <ProcessingTimelineRow title="Deposit initiated" subtitle="Just now" state="complete" />
          <ProcessingTimelineRow title="Processing transfer" subtitle="This won’t take long" state="current" />
          <ProcessingTimelineRow title="Converting to USDC" subtitle="Next" state="pending" />
          <ProcessingTimelineRow title="Updating your balance" subtitle="Final step" state="pending" />
        </VStack>
      </VStack>

      <Spacer />
      <FlowNotice
        symbol="info.circle"
        title="You can close this screen"
        subtitle="We’ll send you a notification when it’s ready."
      />
    </VStack>
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
    <VStack
      alignment="center"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <HStack modifiers={[frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size })]}>
        <Spacer />
        <Button
          label="Close"
          systemImage="xmark"
          onPress={onDone}
          modifiers={[
            buttonStyle('plain'),
            labelStyle('iconOnly'),
            frame({ width: componentTokens.headerControl.size, height: componentTokens.headerControl.size }),
            background(colors.surface, shapes.circle()),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'circle',
            }),
          ]}
        />
      </HStack>

      <VStack alignment="center" spacing={0} modifiers={[padding({ top: 36 }), frame({ maxWidth: Infinity })]}>
        <ZStack
          modifiers={[
            frame({ width: screenTokens.addMoney.successIconSize, height: screenTokens.addMoney.successIconSize }),
            background(colors.surfaceSecondary, shapes.circle()),
            strokeBorder({
              content: colors.action,
              style: { lineWidth: 1 },
              shape: 'circle',
            }),
          ]}
        >
          <Image systemName="checkmark" size={34} color={colors.action} />
        </ZStack>

        <Text
          modifiers={[
            padding({ top: 24 }),
            font({ size: 22, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          Money added
        </Text>
        <Text
          modifiers={[
            padding({ top: 14 }),
            font({ size: typography.balanceMedium, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {formatTry(quote.amount)}
        </Text>
        <Text
          modifiers={[
            padding({ top: 4 }),
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {formatUsdc(quote.receivedAmount)}
        </Text>

        <Group modifiers={[padding({ top: 28 })]}>
          <FlowNotice
            symbol="wallet.bifold.fill"
            title="Available balance updated"
            subtitle="Your funds are now in your Trinqa account."
          />
        </Group>
      </VStack>

      <Spacer />
      <VStack spacing={10}>
        <PrimaryActionButton label="Done" onPress={onDone} />
        <SecondaryActionButton label="Put it to work" onPress={onPutToWork} />
      </VStack>
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
  const goToEarn = () => router.replace('/earn');

  return (
    <FlowShell>
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
        <SuccessStep onDone={goToWallet} onPutToWork={goToEarn} quote={quote} />
      ) : null}
    </FlowShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  host: {
    flex: 1,
  },
});
