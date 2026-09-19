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
import { bootstrapAccount, setAccountBootstrap, useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing, typography } from '@/theme';

export function OnboardingScreen() {
  const router = useRouter();
  const { accountBootstrap } = useMockAppState();

  useEffect(() => {
    if (accountBootstrap !== 'creating') return;
    let cancelled = false;
    void (async () => {
      try {
        await bootstrapAccount();
        if (!cancelled) {
          setAccountBootstrap('ready');
          router.replace('/');
        }
      } catch {
        if (!cancelled) setAccountBootstrap('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountBootstrap, router]);

  if (accountBootstrap === 'error') {
    return (
      <FlowScreenShell>
        <FlowErrorState
          title="Account couldn't be prepared"
          subtitle="Could not reach the Trinqa backend or resolve a Stellar account."
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
        <ZStack modifiers={[frame({ width: 92, height: 92 }), background(colors.textPrimary, shapes.circle())]}>
          {accountBootstrap === 'creating' ? (
            <ProgressView modifiers={[progressViewStyle('circular'), controlSize('large'), tint(colors.action)]} />
          ) : (
            <Image systemName="hand.thumbsup.fill" size={38} color={colors.textInverse} />
          )}
        </ZStack>
        <Text
          modifiers={[
            padding({ top: spacing.flowBlock }),
            font({ size: typography.pageTitle, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {accountBootstrap === 'creating' ? 'Creating your account' : 'Welcome to Trinqa'}
        </Text>
        <Text
          modifiers={[
            padding({ top: spacing.row }),
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {accountBootstrap === 'creating'
            ? 'Getting your Trinqa account ready.'
            : 'See your money, send it, or let it grow.'}
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
