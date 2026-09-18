import { useEffect } from 'react';

import { Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  controlSize,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { PrimaryActionButton, SecondaryActionButton } from '@/components/FlowControls';
import { FlowErrorState } from '@/components/FlowStates';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { setAccountBootstrap, useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, typography } from '@/theme';

export function OnboardingScreen() {
  const router = useRouter();
  const { accountBootstrap } = useMockAppState();

  useEffect(() => {
    if (accountBootstrap !== 'creating') return;
    const timer = setTimeout(() => {
      setAccountBootstrap('ready');
      router.replace('/');
    }, 850);
    return () => clearTimeout(timer);
  }, [accountBootstrap, router]);

  if (accountBootstrap === 'error') {
    return (
      <FlowScreenShell>
        <FlowErrorState
          title="Account couldn't be prepared"
          subtitle="Try again to continue with the mock Trinqa account."
          onRetry={() => setAccountBootstrap('creating')}
          onCancel={() => setAccountBootstrap('new')}
        />
      </FlowScreenShell>
    );
  }

  return (
    <FlowScreenShell>
      <VStack
        alignment="center"
        spacing={0}
        modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
      >
        <Spacer />
        <ZStack modifiers={[frame({ width: 92, height: 92 }), background(colors.cardSleeve, shapes.circle())]}>
          {accountBootstrap === 'creating' ? (
            <ProgressView modifiers={[progressViewStyle('circular'), controlSize('large'), tint(colors.action)]} />
          ) : (
            <Image systemName="hand.thumbsup.fill" size={38} color={colors.surface} />
          )}
        </ZStack>
        <Text
          modifiers={[
            padding({ top: 28 }),
            font({ size: 28, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {accountBootstrap === 'creating' ? 'Creating your account' : 'Welcome to Trinqa'}
        </Text>
        <Text
          modifiers={[
            padding({ top: 8 }),
            font({ size: typography.body }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {accountBootstrap === 'creating'
            ? 'Getting your Trinqa account ready.'
            : 'Your money works until you need it.'}
        </Text>
        <Spacer />
        {accountBootstrap === 'new' ? (
          <VStack spacing={10}>
            <PrimaryActionButton label="Get started" onPress={() => setAccountBootstrap('creating')} />
            <SecondaryActionButton label="I already have an account" onPress={() => setAccountBootstrap('creating')} />
          </VStack>
        ) : null}
      </VStack>
    </FlowScreenShell>
  );
}
