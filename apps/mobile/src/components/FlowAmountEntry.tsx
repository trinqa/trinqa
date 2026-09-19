import {
  Group,
  HStack,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  fixedSize,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  monospacedDigit,
  padding,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import {
  FlowQuickAmountButton,
  FlowSelectionBadge,
  PrimaryActionButton,
} from '@/components/FlowControls';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, screenTokens, typography, spacing } from '@/theme';

interface FlowAmountEntryProps {
  amount: number;
  amountAccessory?: React.ReactElement;
  amountText: ReturnType<typeof useNativeState<string>>;
  currencySymbol: string;
  formatQuickAmount: (amount: number) => string;
  onAmountChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onQuickAmount: (amount: number) => void;
  quickAmounts: readonly number[];
  selectionSymbol: SFSymbol;
  selectionTitle: string;
  summary: React.ReactElement;
  title: string;
  isContinueDisabled?: boolean;
}

/** Approved Add Money amount-entry geometry shared by money movement flows. */
export function FlowAmountEntry({
  amount,
  amountAccessory,
  amountText,
  currencySymbol,
  formatQuickAmount,
  isContinueDisabled = false,
  onAmountChange,
  onBack,
  onContinue,
  onQuickAmount,
  quickAmounts,
  selectionSymbol,
  selectionTitle,
  summary,
  title,
}: FlowAmountEntryProps) {
  const flow = screenTokens.addMoney;

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: flow.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
        <ScreenHeader showBack title={title} onBackPress={onBack} />
      </Group>

      <VStack
        alignment="center"
        spacing={0}
        modifiers={[padding({ top: flow.headerToContent }), frame({ maxWidth: Infinity })]}
      >
        <FlowSelectionBadge title={selectionTitle} symbol={selectionSymbol} />

        {/* HStack has no fixed width so the VStack's center alignment clusters
            number + symbol tightly together. fixedSize shrinks the TextField
            to its content width, matching the Home wallet currencyGap pattern. */}
        <HStack
          alignment="firstTextBaseline"
          spacing={4}
          modifiers={[
            padding({ top: flow.amountTopGap }),
            frame({ height: flow.amountFieldHeight }),
          ]}
        >
          <TextField
            autoFocus
            maxLength={13}
            text={amountText}
            onTextChange={onAmountChange}
            modifiers={[
              textFieldStyle('plain'),
              keyboardType('numeric'),
              monospacedDigit(),
              font({ size: typography.amountHero, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
              frame({ height: flow.amountFieldHeight }),
              fixedSize({ horizontal: true }),
            ]}
          />
          <Text
            modifiers={[
              font({ size: typography.amountCurrency, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {currencySymbol}
          </Text>
        </HStack>

        {amountAccessory ? (
          <Group modifiers={[padding({ top: screenTokens.paymentFlow.currencyTopGap })]}>
            {amountAccessory}
          </Group>
        ) : null}

        <HStack spacing={flow.quickAmountGap} modifiers={[padding({ top: 12 })]}>
          {quickAmounts.map((quickAmount) => (
            <FlowQuickAmountButton
              key={quickAmount}
              label={formatQuickAmount(quickAmount)}
              selected={amount === quickAmount}
              onPress={() => onQuickAmount(quickAmount)}
            />
          ))}
        </HStack>

        <Group modifiers={[padding({ top: flow.summaryTopGap })]}>{summary}</Group>
      </VStack>

      <Spacer />
      <PrimaryActionButton
        label="Continue"
        onPress={onContinue}
        isDisabled={isContinueDisabled}
      />
    </VStack>
  );
}
