import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowErrorState } from '@/components/FlowStates';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import {
  useWelcomeDeck,
  WelcomeDeckMedia,
  WelcomeDeckText,
  WelcomeDots,
} from '@/features/onboarding/WelcomeCarousel';
import { welcomePalette as palette } from '@/features/onboarding/welcomePalette';
import { errorMessage } from '@/services/apiErrors';
import { registerPushToken, requestPushPermission } from '@/services/pushNotifications';
import { bootstrapAccount, setAccountBootstrap, useMockAppState } from '@/state/mockAppState';
import { componentTokens } from '@/theme';

const LOGO = require('../../../assets/images/trinqa-logo-light.png') as number;

function WelcomeButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'accent' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'accent' ? styles.buttonAccent : styles.buttonGhost,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const { accountBootstrap } = useMockAppState();
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const isCreating = accountBootstrap === 'creating';
  const deck = useWelcomeDeck();

  useEffect(() => {
    if (accountBootstrap !== 'creating') return;
    let cancelled = false;
    // Asked as the user leaves the welcome screen and never awaited, so the system prompt
    // runs alongside account creation instead of holding it up.
    void requestPushPermission();
    void (async () => {
      try {
        const accountId = await bootstrapAccount();
        if (!cancelled) {
          setAccountBootstrap('ready');
          router.replace('/');
          // The account exists only now, so this is the first moment a token can belong to
          // it. Not awaited: the home screen must not wait on a notification token.
          void registerPushToken(accountId);
        }
      } catch (err) {
        // The real reason matters here: a missing demo token and an unreachable
        // backend both used to read as the same generic failure.
        if (!cancelled) {
          setBootstrapError(errorMessage(err, 'Could not reach the Trinqa backend.'));
          setAccountBootstrap('error');
        }
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
          subtitle={bootstrapError ?? 'Could not reach the Trinqa backend or resolve a Stellar account.'}
          onRetry={() => setAccountBootstrap('creating')}
          onCancel={() => setAccountBootstrap('new')}
        />
      </FlowScreenShell>
    );
  }

  if (isCreating) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.creating}>
            <Text style={styles.title}>Creating your account</Text>
            <Text style={styles.body}>Getting your Trinqa account ready.</Text>
          </View>
          <View style={styles.foot}>
            <ActivityIndicator color={palette.action} size="large" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />

        <WelcomeDeckMedia index={deck.index} />

        <View style={styles.foot}>
          <WelcomeDeckText index={deck.index} />

          <View style={styles.controls}>
            <WelcomeDots index={deck.index} onSelect={deck.goTo} />
          </View>

          <WelcomeButton
            label={deck.slide.cta}
            tone="accent"
            onPress={() => (deck.isLast ? setAccountBootstrap('creating') : deck.advance())}
          />

          {deck.isLast ? (
            <WelcomeButton
              label="I already have an account"
              tone="ghost"
              onPress={() => setAccountBootstrap('creating')}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  logo: {
    width: 34,
    height: 34,
    marginLeft: 22,
    marginTop: 4,
  },
  creating: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  foot: {
    paddingHorizontal: 22,
    paddingBottom: 12,
    gap: 9,
  },
  controls: {
    height: 34,
    justifyContent: 'center',
  },
  title: {
    color: palette.title,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  body: {
    color: palette.body,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 11,
  },
  button: {
    height: componentTokens.actionButton.height,
    borderRadius: componentTokens.actionButton.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonAccent: {
    backgroundColor: palette.action,
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: palette.ghostBorder,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.title,
  },
});
