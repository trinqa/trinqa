import { useState } from 'react';

import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';

import { ActivityChart } from '@/components/ActivityChart';
import { ActivityLowerModule } from '@/components/ActivityLowerModule';
import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import {
  activityChartPoints,
  activityEarnings,
  activityHeadline,
  activityMetrics,
  activityPayments,
} from '@/data/mocks/activity';
import { colors } from '@/theme';
import { captionTextModifiers } from '@/theme/swiftUi';
import type { ActivitySegment } from '@/types';

const METRIC_WIDTHS = [117, 117, 118] as const;

export function ActivityScreen() {
  const [segment, setSegment] = useState<ActivitySegment>('payments');
  const listItems =
    segment === 'payments' ? activityPayments : activityEarnings;

  return (
    <SwiftUIScreenShell sectionGap={0}>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
        <ScreenHeader showBack title="Activity" showMenu />

        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[
            padding({ top: 25 }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text
            modifiers={[
              ...captionTextModifiers(),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            {activityHeadline.label}
          </Text>
          <Text
            modifiers={[
              font({ size: 25, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            {activityHeadline.value}
          </Text>
        </VStack>

        <VStack
          alignment="leading"
          modifiers={[padding({ top: 16 }), frame({ maxWidth: Infinity })]}
        >
          <ActivityChart points={activityChartPoints} />
        </VStack>

        <HStack
          spacing={7}
          modifiers={[padding({ top: 21 }), frame({ maxWidth: Infinity })]}
        >
          {activityMetrics.map((metric, index) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              width={METRIC_WIDTHS[index] ?? 117}
            />
          ))}
        </HStack>

        <VStack modifiers={[padding({ top: 23 }), frame({ maxWidth: Infinity })]}>
          <ActivityLowerModule
            segment={segment}
            onChange={setSegment}
            items={listItems}
          />
        </VStack>
      </VStack>
    </SwiftUIScreenShell>
  );
}
