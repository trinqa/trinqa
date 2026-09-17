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
  progressChartPoints,
  progressHeadline,
  progressMetrics,
} from '@/data/mocks/progress';
import { colors, screenTokens } from '@/theme';
import { captionTextModifiers } from '@/theme/swiftUi';
import type { InstallmentSegment } from '@/types';

const METRIC_WIDTHS = [112, 112, 112] as const;

export function ProgressScreen() {
  const [segment, setSegment] = useState<InstallmentSegment>('four');
  const items = installmentItems.filter((item) => item.plan === segment);
  const progress = screenTokens.progress;

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title="Analytics" showMenu />
      </Group>

      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          padding({ top: progress.headlineTopGap }),
          padding({ leading: progress.contentHorizontalOffset }),
          frame({ width: progress.contentWidth, alignment: 'leading' }),
        ]}
      >
        <Text
          modifiers={[
            ...captionTextModifiers('medium'),
            font({ size: 16, weight: 'medium' }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {progressHeadline.label}
        </Text>
        <HStack alignment="firstTextBaseline" spacing={0}>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(colors.textSecondary)]}>
            $
          </Text>
          <Text modifiers={[font({ size: 25, weight: 'bold' }), foregroundStyle(colors.textPrimary)]}>
            {progressHeadline.value.replace(/^\$/, '')}
          </Text>
        </HStack>
      </VStack>

      <VStack
        modifiers={[
          padding({ top: progress.chartTopGap, leading: progress.contentHorizontalOffset }),
          frame({ width: progress.contentWidth }),
        ]}
      >
        <ActivityChart points={progressChartPoints} />
      </VStack>

      <HStack
        spacing={progress.metricGap}
        modifiers={[
          padding({ top: progress.metricTopGap, leading: progress.contentHorizontalOffset }),
          frame({ width: progress.contentWidth }),
        ]}
      >
        {progressMetrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            width={METRIC_WIDTHS[index] ?? 117}
          />
        ))}
      </HStack>

      <VStack modifiers={[padding({ top: progress.lowerPanelTopGap }), frame({ width: progress.contentWidth })]}>
        <InstallmentPanel segment={segment} onChange={setSegment} items={items} />
      </VStack>
    </SwiftUIScreenShell>
  );
}
