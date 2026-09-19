import { useState } from 'react';

import { BottomSheet, Button, DisclosureGroup, Divider, Group, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';

import { FlowInfoRow, SecondaryActionButton } from '@/components/FlowControls';
import { colors, typography } from '@/theme';
import type { PutToWorkRiskProfile } from '@/types';

export function StrategyDetailsSheet({ profile }: { profile: PutToWorkRiskProfile }) {
  const [isPresented, setIsPresented] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  return (
    <BottomSheet
      isPresented={isPresented}
      onIsPresentedChange={setIsPresented}
      anchor={
        <Button
          label="See risk details"
          systemImage="info.circle"
          onPress={() => setIsPresented(true)}
          modifiers={[buttonStyle('bordered')]}
        />
      }
    >
      <Group
        modifiers={[
          presentationDetents([{ height: 520 }]),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        <VStack alignment="leading" spacing={12} modifiers={[padding({ top: 18, bottom: 14, horizontal: 18 })]}>
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
              Why this strategy?
            </Text>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
              {profile.recommendationReason}
            </Text>
          </VStack>
          <Divider />
          <FlowInfoRow label="Strategy" value={profile.title} emphasized />
          <FlowInfoRow label="Risk" value={profile.riskLabel} />
          <FlowInfoRow label="Estimated APY" value={`~${profile.estimatedApy.toFixed(1)}%`} />
          <FlowInfoRow label="Access" value={profile.accessDescription} />
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>Main risk</Text>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textPrimary)]}>
              {profile.mainRisk}
            </Text>
          </VStack>
          <DisclosureGroup
            label="Advanced details"
            isExpanded={advancedExpanded}
            onIsExpandedChange={setAdvancedExpanded}
          >
            <VStack alignment="leading" spacing={10} modifiers={[padding({ top: 8 })]}>
              <FlowInfoRow label="Underlying provider" value={profile.underlyingProvider ?? 'Automatic'} />
              <FlowInfoRow label="Current allocation" value={`${profile.title} strategy`} />
            </VStack>
          </DisclosureGroup>
          <SecondaryActionButton label="Close" onPress={() => setIsPresented(false)} />
        </VStack>
      </Group>
    </BottomSheet>
  );
}
