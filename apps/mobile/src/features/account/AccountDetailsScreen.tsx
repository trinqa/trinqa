import { useState } from 'react';

import * as Clipboard from 'expo-clipboard';
import { Button, DisclosureGroup, Divider, Group, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { FlowCard, FlowInfoRow } from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMockAppState } from '@/state/mockAppState';
import { colors, screenTokens, typography, spacing } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

export function AccountDetailsScreen() {
  const router = useRouter();
  const { account } = useMockAppState();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <FlowScreenShell>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}>
        <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
          <ScreenHeader showBack title="Account details" onBackPress={() => router.back()} />
        </Group>
        <VStack alignment="leading" spacing={spacing.control} modifiers={[padding({ top: spacing.xxxl })]}>
          <FlowCard>
            <VStack alignment="leading" spacing={spacing.control} modifiers={[padding({ all: spacing.section })]}>
              <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                Trinqa account
              </Text>
              <Divider />
              <FlowInfoRow label="Account holder" value={account.displayName} />
              <FlowInfoRow label="Default currency" value={account.displayCurrency} />
              <FlowInfoRow label="Receive identifier" value={account.publicReceiveIdentifier ?? 'Not available'} />
              <Button
                label={copied ? 'Copied' : 'Copy receive identifier'}
                systemImage={copied ? 'checkmark' : 'doc.on.doc'}
                onPress={async () => {
                  await Clipboard.setStringAsync(account.publicReceiveIdentifier ?? '');
                  setCopied(true);
                }}
                modifiers={[
                  buttonStyle('bordered'),
                  ...hitTargetModifiers({
                    label: copied ? 'Copied' : 'Copy receive identifier',
                  }),
                ]}
              />
            </VStack>
          </FlowCard>
          <DisclosureGroup
            label="Advanced details"
            isExpanded={advancedExpanded}
            onIsExpandedChange={setAdvancedExpanded}
          >
            <VStack alignment="leading" spacing={10} modifiers={[padding({ top: 8 })]}>
              <FlowInfoRow label="Network" value={account.networkDetails?.network ?? 'Mock network'} />
              <FlowInfoRow label="Address" value={account.networkDetails?.address ?? 'Mock address'} />
            </VStack>
          </DisclosureGroup>
        </VStack>
        <Spacer />
      </VStack>
    </FlowScreenShell>
  );
}
