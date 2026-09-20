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
import { hitTargetModifiers } from '@/theme/swiftUi';
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
          label="What's the risk?"
          systemImage="info.circle"
          onPress={() => setIsPresented(true)}
          modifiers={[buttonStyle('bordered'), ...hitTargetModifiers({ label: "What's the risk?" })]}
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
              Why this plan?
            </Text>
            <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
              {profile.recommendationReason}
            </Text>
          </VStack>
          <Divider />
          <FlowInfoRow label="Plan" value={profile.title} emphasized />
          <FlowInfoRow label="How risky" value={profile.riskLabel} />
          <FlowInfoRow label="Yearly return" value={`~${profile.estimatedApy.toFixed(1)}%`} />
          <FlowInfoRow label="When you can use it" value={profile.accessDescription} />
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
              <FlowInfoRow label="Current plan" value={`${profile.title} plan`} />
            </VStack>
          </DisclosureGroup>
          <SecondaryActionButton label="Close" onPress={() => setIsPresented(false)} />
        </VStack>
      </Group>
    </BottomSheet>
  );
}
