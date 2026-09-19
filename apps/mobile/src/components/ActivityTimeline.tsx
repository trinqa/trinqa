import { Group, VStack } from '@expo/ui/swift-ui';
import {
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { ActivityTransactionRow } from '@/components/ActivityTransactionRow';
import { DateSectionDivider } from '@/components/DateSectionDivider';
import { SurfacePanel } from '@/components/SurfacePanel';
import { componentTokens, homeTokens, screenTokens } from '@/theme';
import type { ActivityListItem } from '@/types';

interface ActivitySection {
  id: ActivityListItem['group'];
  title: string;
  items: ActivityListItem[];
}

interface ActivityTimelineProps {
  sections: ActivitySection[];
  onSelect: (id: string) => void;
}

/** Chronological grouped Activity list using the shared Home transaction card. */
export function ActivityTimeline({ sections, onSelect }: ActivityTimelineProps) {
  const activity = screenTokens.activity;
  const timelineContentWidth =
    homeTokens.recent.width - homeTokens.recent.horizontalPadding * 2;

  return (
    <Group modifiers={[frame({ width: activity.contentWidth, alignment: 'center' })]}>
      <SurfacePanel width={homeTokens.recent.width}>
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[
            padding({
              top: homeTokens.recent.topPadding,
              bottom: homeTokens.recent.bottomPadding,
              horizontal: homeTokens.recent.horizontalPadding,
            }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {sections.map((section, sectionIndex) => (
            <VStack
              key={section.id}
              alignment="leading"
              spacing={componentTokens.dateSectionDivider.toRowsGap}
              modifiers={sectionIndex === 0 ? [] : [padding({ top: activity.sectionGap })]}
            >
              <DateSectionDivider
                contentWidth={timelineContentWidth}
                label={section.title}
              />
              <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
                {section.items.map((item) => (
                  <ActivityTransactionRow key={item.id} item={item} onPress={() => onSelect(item.id)} />
                ))}
              </VStack>
            </VStack>
          ))}
        </VStack>
      </SurfacePanel>
    </Group>
  );
}
