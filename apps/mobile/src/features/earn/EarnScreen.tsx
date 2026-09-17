import { useState } from 'react';

import { Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';

import { ActivityChart } from '@/components/ActivityChart';
import { InstallmentPanel } from '@/components/InstallmentPanel';
import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import {
  installmentItems,
  earnChartPoints,
  earnHeadline,
  earnMetrics,
} from '@/data/mocks/earnAnalytics';
import { colors, screenTokens } from '@/theme';
import { captionTextModifiers } from '@/theme/swiftUi';
import type { InstallmentSegment } from '@/types';

const METRIC_WIDTHS = [112, 112, 112] as const;

export function EarnScreen() {
  const [segment, setSegment] = useState<InstallmentSegment>('four');
  const items = installmentItems.filter((item) => item.plan === segment);
  const earn = screenTokens.earn;

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Analytics" showMenu />
      </Group>

      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          padding({ top: earn.headlineTopGap }),
          padding({ leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth, alignment: 'leading' }),
        ]}
      >
        <Text
          modifiers={[
            ...captionTextModifiers('medium'),
            font({ size: 16, weight: 'medium' }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {earnHeadline.label}
        </Text>
        <HStack alignment="firstTextBaseline" spacing={0}>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(colors.textSecondary)]}>
            $
          </Text>
          <Text modifiers={[font({ size: 25, weight: 'bold' }), foregroundStyle(colors.textPrimary)]}>
            {earnHeadline.value.replace(/^\$/, '')}
          </Text>
        </HStack>
      </VStack>

      <VStack
        modifiers={[
          padding({ top: earn.chartTopGap, leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth }),
        ]}
      >
        <ActivityChart points={earnChartPoints} />
      </VStack>

      <HStack
        spacing={earn.metricGap}
        modifiers={[
          padding({ top: earn.metricTopGap, leading: earn.contentHorizontalOffset }),
          frame({ width: earn.contentWidth }),
        ]}
      >
        {earnMetrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            width={METRIC_WIDTHS[index] ?? 117}
          />
        ))}
      </HStack>

      <VStack modifiers={[padding({ top: earn.lowerPanelTopGap }), frame({ width: earn.contentWidth })]}>
        <InstallmentPanel segment={segment} onChange={setSegment} items={items} />
      </VStack>
    </SwiftUIScreenShell>
  );
}
