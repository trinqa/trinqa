import { useMemo, useState } from 'react';

import * as Clipboard from 'expo-clipboard';
import {
  Button,
  DisclosureGroup,
  Divider,
  Group,
  HStack,
  RNHostView,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  padding,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { Share } from 'react-native';

import { FlowCard, FlowInfoRow, FlowStepLayout, SecondaryActionButton } from '@/components/FlowControls';
import { FlowCurrencyMenu } from '@/components/FlowCurrencyMenu';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { MockQrCode } from '@/components/MockQrCode';
import { currenciesFor } from '@/data/capabilities';
import { formatMoney } from '@/domain/money';
import { useMockAppState } from '@/state/mockAppState';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import type { CurrencyCode, ReceiveIntent, ReceivePresentation } from '@/types';

type ReceiveStep = 'request' | 'code';

export function ReceiveFlowScreen() {
  const router = useRouter();
  const { account } = useMockAppState();
  const currencies = currenciesFor('receive');
  const [step, setStep] = useState<ReceiveStep>('request');
  const [currency, setCurrency] = useState<CurrencyCode>(account.displayCurrency);
  const [amount, setAmount] = useState(250);
  const [copied, setCopied] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const amountText = useNativeState('250');

  const intent = useMemo<ReceiveIntent>(
    () => ({
      amount: amount > 0 ? amount.toFixed(2) : undefined,
      currency: amount > 0 ? currency : undefined,
      recipientAccountId: account.id,
    }),
    [account.id, amount, currency],
  );

  const presentation = useMemo<ReceivePresentation>(() => {
    const displayAmount = intent.amount ? formatMoney(Number(intent.amount), currency) : undefined;
    const receiveIdentifier = account.publicReceiveIdentifier ?? 'trinqa-user.mock';
    const qrPayload = `trinqa://receive/${account.id}?currency=${intent.currency ?? ''}&amount=${intent.amount ?? ''}`;
    return {
      displayAmount,
      displayCurrency: intent.currency,
      qrPayload,
      receiveIdentifier,
      shareText: displayAmount
        ? `Send ${displayAmount} to ${receiveIdentifier} on Trinqa.`
        : `Send money to ${receiveIdentifier} on Trinqa.`,
      networkDetails: account.networkDetails,
    };
  }, [account, currency, intent]);

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    const nextAmount = digits ? Number(digits) : 0;
    setAmount(nextAmount);
    if (digits !== value) amountText.set(digits);
  };

  const goBack = () => {
    if (step === 'code') setStep('request');
    else router.back();
  };

  const copyIdentifier = async () => {
    await Clipboard.setStringAsync(presentation.receiveIdentifier);
    setCopied(true);
  };

  return (
    <FlowScreenShell>
      {step === 'request' ? (
        <FlowStepLayout
          title="Receive money"
          onBack={goBack}
          primaryLabel="Show QR"
          onPrimaryPress={() => setStep('code')}
        >
          <VStack alignment="leading" spacing={spacing.section} modifiers={[padding({ top: spacing.flowBlock })]}>
            <VStack alignment="leading" spacing={5}>
              <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                Request a specific amount
              </Text>
              <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
                Optional — you can continue without an amount.
              </Text>
            </VStack>
            <HStack spacing={10} modifiers={[frame({ width: screenTokens.addMoney.contentWidth })]}>
              <TextField
                text={amountText}
                placeholder="Amount"
                onTextChange={updateAmount}
                modifiers={[
                  textFieldStyle('roundedBorder'),
                  keyboardType('numeric'),
                  frame({ maxWidth: Infinity, height: componentTokens.actionButton.height }),
                ]}
              />
              <FlowCurrencyMenu
                accessibilityName="Receive currency"
                value={currency}
                options={currencies}
                onChange={setCurrency}
              />
            </HStack>
            <SecondaryActionButton
              label="Continue without amount"
              onPress={() => {
                setAmount(0);
                amountText.set('');
                setStep('code');
              }}
            />
          </VStack>
        </FlowStepLayout>
      ) : null}

      {step === 'code' ? (
        <FlowStepLayout title="Receive money" onBack={goBack} primaryLabel="Done" onPrimaryPress={() => router.replace('/')}>
          <VStack alignment="center" spacing={12} modifiers={[padding({ top: 22 }), frame({ width: screenTokens.addMoney.contentWidth })]}>
            <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
              {presentation.displayAmount ?? 'No amount specified'}
            </Text>
            <FlowCard>
              <VStack alignment="center" spacing={14} modifiers={[padding({ vertical: 18 }), frame({ maxWidth: Infinity })]}>
                <Group modifiers={[frame({ width: 190, height: 190 })]}>
                  <RNHostView matchContents>
                    <MockQrCode payload={presentation.qrPayload} />
                  </RNHostView>
                </Group>
                <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textPrimary)]}>
                  {presentation.receiveIdentifier}
                </Text>
              </VStack>
            </FlowCard>
            <HStack spacing={8}>
              <Button
                label="Share"
                systemImage="square.and.arrow.up"
                onPress={() => Share.share({ message: presentation.shareText })}
                modifiers={[buttonStyle('borderedProminent'), accessibilityLabel('Share receive request')]}
              />
              <Button
                label={copied ? 'Copied' : 'Copy'}
                systemImage={copied ? 'checkmark' : 'doc.on.doc'}
                onPress={copyIdentifier}
                modifiers={[buttonStyle('bordered'), accessibilityLabel('Copy receive identifier')]}
              />
            </HStack>
            <Divider />
            <DisclosureGroup
              label="Receiving details"
              isExpanded={advancedExpanded}
              onIsExpandedChange={setAdvancedExpanded}
            >
              <VStack alignment="leading" spacing={9} modifiers={[padding({ top: 8 }), frame({ width: screenTokens.addMoney.contentWidth })]}>
                <FlowInfoRow label="Network" value={presentation.networkDetails?.network ?? 'Mock network'} />
                <FlowInfoRow label="Address" value={presentation.networkDetails?.address ?? 'Mock address'} />
                <FlowInfoRow label="Asset" value={presentation.networkDetails?.asset ?? 'Mock asset'} />
              </VStack>
            </DisclosureGroup>
            <Spacer />
          </VStack>
        </FlowStepLayout>
      ) : null}
    </FlowScreenShell>
  );
}
