import { useState } from 'react';

import { Group, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';

import { ActivitySegmentPicker } from '@/components/ActivitySegmentPicker';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { activityItems } from '@/data/mocks/activity';
import { colors, screenTokens, typography } from '@/theme';
import type { ActivitySegment } from '@/types';

const GROUPS = [
  { id: 'today', title: 'Today' },
  { id: 'yesterday', title: 'Yesterday' },
  { id: 'november-18', title: 'Nov 18, 2025' },
] as const;

export function ActivityScreen() {
  const [segment, setSegment] = useState<ActivitySegment>('all');
  const activity = screenTokens.activity;
  const filteredItems = activityItems.filter(
    (item) => segment === 'all' || item.category === segment,
  );
  const sections = GROUPS.map((group) => ({
    ...group,
    items: filteredItems.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
        <Group modifiers={[padding({ horizontal: 8 })]}>
          <ScreenHeader />
        </Group>

        <VStack
          alignment="leading"
          spacing={activity.titleSubtitleGap}
          modifiers={[
            padding({ top: activity.headerToTitle }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.activityTitle, weight: 'bold' }),
              foregroundStyle(colors.textPrimary),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            Activity
          </Text>
          <Text
            modifiers={[
              font({ size: typography.body }),
              foregroundStyle(colors.textSecondary),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
            ]}
          >
            Everything that happened to your money.
          </Text>
        </VStack>

        <Group modifiers={[padding({ top: activity.subtitleToSegment })]}>
          <ActivitySegmentPicker segment={segment} onChange={setSegment} />
        </Group>

        <Group modifiers={[padding({ top: activity.segmentToPanel })]}>
          <ActivityTimeline sections={sections} />
        </Group>
      </VStack>
    </SwiftUIScreenShell>
  );
}
