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
  font,
  foregroundStyle,
  frame,
  keyboardType,
  monospacedDigit,
  multilineTextAlignment,
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
import { colors, screenTokens, typography } from '@/theme';

interface FlowAmountEntryProps {
  amount: number;
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
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title={title} onBackPress={onBack} />
      </Group>

      <VStack
        alignment="center"
        spacing={0}
        modifiers={[padding({ top: flow.headerToContent }), frame({ maxWidth: Infinity })]}
      >
        <FlowSelectionBadge title={selectionTitle} symbol={selectionSymbol} />

        <HStack
          alignment="firstTextBaseline"
          spacing={4}
          modifiers={[
            padding({ top: flow.amountTopGap }),
            frame({ width: flow.contentWidth, height: flow.amountFieldHeight }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.balanceMedium, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {currencySymbol}
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
              frame({ width: 270, height: flow.amountFieldHeight }),
            ]}
          />
        </HStack>

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
