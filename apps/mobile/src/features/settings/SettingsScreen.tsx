import { Button, Form, Group, Picker, Section, Text, Toggle, VStack } from '@expo/ui/swift-ui';
import { frame, padding, pickerStyle, scrollContentBackground, tag } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { currenciesFor } from '@/data/capabilities';
import { setDisplayCurrency, setSecurityEnabled, useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, spacing } from '@/theme';
import type { CurrencyCode } from '@/types';

export function SettingsScreen() {
  const router = useRouter();
  const { account, settings } = useMockAppState();
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
              label="Default display currency"
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
          <Section title="Help & legal">
            <Button label="Risk & legal" systemImage="doc.text" onPress={showRiskAndLegal} />
            <Button label="Support" systemImage="headphones" onPress={showSupport} />
          </Section>
        </Form>
      </VStack>
    </FlowScreenShell>
  );
}
