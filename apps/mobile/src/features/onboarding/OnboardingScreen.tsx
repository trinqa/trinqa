import { useEffect } from 'react';

import { Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  controlSize,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  resizable,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useAssets } from 'expo-asset';
import { useRouter } from 'expo-router';

import { PrimaryActionButton, SecondaryActionButton } from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { setAccountBootstrap, useMockAppState } from '@/state/mockAppState';
import { colors, motion, screenTokens, spacing, typography } from '@/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoAssetModule = require('../../../assets/images/logo.png') as number;

export function OnboardingScreen() {
  const router = useRouter();
  const { accountBootstrap } = useMockAppState();
  const [logoAssets] = useAssets([logoAssetModule]);
  const logoUri = logoAssets?.[0]?.localUri ?? null;

  useEffect(() => {
    if (accountBootstrap !== 'creating') return;
    const timer = setTimeout(() => {
      setAccountBootstrap('ready');
      router.replace('/');
    }, motion.duration.onboardingReady);
    return () => clearTimeout(timer);
  }, [accountBootstrap, router]);

  return (
    <FlowScreenShell>
      <VStack
        alignment="center"
        spacing={0}
        modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
      >
        <Spacer />
        {accountBootstrap === 'creating' ? (
          <ZStack
            modifiers={[frame({ width: 92, height: 92 }), background(colors.textPrimary, shapes.circle())]}
          >
            <ProgressView modifiers={[progressViewStyle('circular'), controlSize('large'), tint(colors.action)]} />
          </ZStack>
        ) : logoUri ? (
          <Image
            uiImage={logoUri}
            modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: 92, height: 92 })]}
          />
        ) : (
          // Logo not yet resolved — reserve space so layout is stable
          <ZStack modifiers={[frame({ width: 92, height: 92 })]}>{null}</ZStack>
        )}
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
