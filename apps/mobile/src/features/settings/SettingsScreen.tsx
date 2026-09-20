import { Button, Form, Group, Picker, Section, Text, Toggle, VStack } from '@expo/ui/swift-ui';
import { frame, padding, pickerStyle, scrollContentBackground, tag } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { currenciesFor } from '@/data/capabilities';
import { usePushPermission } from '@/features/notifications/useNotifications';
import type { PushPermission } from '@/services/pushNotifications';
import { setDisplayCurrency, setSecurityEnabled, useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';
import type { CurrencyCode } from '@/types';

/**
 * Plain status only: once someone denies notifications the OS owns that choice, so a
 * toggle here would be a switch that does nothing.
 */
function notificationStatusLine(permission: PushPermission): string {
  const settingsApp = Platform.OS === 'ios' ? 'iOS Settings' : 'your device settings';
  switch (permission) {
    case 'granted':
      return 'Notifications are on for this device.';
    case 'denied':
      return `Notifications are off. You can turn them back on for Trinqa in ${settingsApp}.`;
    case 'undetermined':
      return 'Trinqa has not asked to send you notifications yet.';
    case 'unavailable':
      return 'Notifications are not available on this device.';
  }
}

export function SettingsScreen() {
  const router = useRouter();
  const { account, settings } = useMockAppState();
  const pushPermission = usePushPermission();
  const displayCurrencies = currenciesFor('display');
  const showRiskAndLegal = () => {
    Alert.alert(
      'Risk & legal',
      'Returns can change and are not guaranteed. Trinqa will show the final provider and legal terms before real money moves.',
    );
  };
  const showSupport = () => {
    Alert.alert(
      'Support',
      'In-app support is ready for provider connection. For this frontend build, no message is sent.',
    );
  };

  return (
    <FlowScreenShell>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}>
        <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
          <ScreenHeader showBack title="Settings" onBackPress={() => router.back()} />
        </Group>
        <Form modifiers={[padding({ top: spacing.control }), frame({ maxWidth: Infinity, maxHeight: Infinity }), scrollContentBackground('hidden')]}>
          <Section title="Account">
            <Text>{account.displayName}</Text>
            <Picker
              label="Currency you see"
              selection={account.displayCurrency}
              onSelectionChange={(value) => setDisplayCurrency(value as CurrencyCode)}
              modifiers={[pickerStyle('menu')]}
            >
              {displayCurrencies.map((currency) => (
                <Text key={currency} modifiers={[tag(currency)]}>{currency}</Text>
              ))}
            </Picker>
          </Section>
          <Section title="Security">
            <Toggle
              label="Require device security"
              isOn={settings.securityEnabled}
              onIsOnChange={setSecurityEnabled}
            />
          </Section>
          {/* Hidden until the first check answers, so the line never flips under the user. */}
          {pushPermission ? (
            <Section title="Notifications">
              <Text>{notificationStatusLine(pushPermission)}</Text>
            </Section>
          ) : null}
          <Section title="Transfers">
            <Button
              label="Anchor directory"
              systemImage="building.columns"
              onPress={() => router.push('/anchors')}
              modifiers={hitTargetModifiers({ label: 'Anchor directory' })}
            />
          </Section>
          <Section title="Help & legal">
            <Button
              label="Risk & legal"
              systemImage="doc.text"
              onPress={showRiskAndLegal}
              modifiers={hitTargetModifiers({ label: 'Risk & legal' })}
            />
            <Button
              label="Support"
              systemImage="headphones"
              onPress={showSupport}
              modifiers={hitTargetModifiers({ label: 'Support' })}
            />
          </Section>
        </Form>
      </VStack>
    </FlowScreenShell>
  );
}
