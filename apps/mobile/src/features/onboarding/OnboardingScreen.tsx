import { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlowErrorState } from '@/components/FlowStates';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { WelcomeHero } from '@/features/onboarding/WelcomeHero';
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
  tone: 'light' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'light' ? styles.buttonLight : styles.buttonGhost,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'light' ? styles.buttonLabelDark : null]}>{label}</Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const { accountBootstrap } = useMockAppState();
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const isCreating = accountBootstrap === 'creating';

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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Hero and foot split so the headline's centre lands on the middle of the screen. */}
        <View style={styles.heroSlot}>
          <WelcomeHero logo={LOGO} isCreating={isCreating} />
        </View>

        <View style={styles.foot}>
          <Text style={styles.title}>
            {isCreating ? 'Creating your account' : 'Your money should work until you need it.'}
          </Text>
          <Text style={styles.sub}>
            {isCreating
              ? 'Getting your Trinqa account ready.'
              : 'Trinqa keeps your idle balance earning, then frees up only what you need.'}
          </Text>

          <View style={styles.actions}>
            {isCreating ? (
              <ActivityIndicator color={palette.action} size="large" />
            ) : (
              <>
                <WelcomeButton
                  label="Start earning"
                  tone="light"
                  onPress={() => setAccountBootstrap('creating')}
                />
                <WelcomeButton
                  label="I already have an account"
                  tone="ghost"
                  onPress={() => setAccountBootstrap('creating')}
                />
              </>
            )}
          </View>
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
  heroSlot: {
    flex: 0.8,
  },
  foot: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  title: {
    color: palette.title,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  sub: {
    color: palette.body,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 11,
  },
  actions: {
    marginTop: 'auto',
    gap: 9,
    alignItems: 'stretch',
  },
  button: {
    height: componentTokens.actionButton.height,
    borderRadius: componentTokens.actionButton.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLight: {
    backgroundColor: palette.title,
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
  buttonLabelDark: {
    color: palette.background,
  },
});
