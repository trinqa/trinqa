import { Divider, Group, HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  allowsTightening,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { ActivityTransactionRow } from '@/components/ActivityTransactionRow';
import { SurfacePanel } from '@/components/SurfacePanel';
import { colors, screenTokens } from '@/theme';
import type { ActivityListItem } from '@/types';

interface ActivitySection {
  id: ActivityListItem['group'];
  title: string;
  items: ActivityListItem[];
}

interface ActivityTimelineProps {
  sections: ActivitySection[];
}

function DateSectionHeader({ title }: { title: string }) {
  const activity = screenTokens.activity;
  const contentWidth =
    activity.panelWidth - activity.panelPaddingHorizontal * 2;
  const labelWidth =
    title === 'Today'
      ? activity.dateLabelWidths.today
      : title === 'Yesterday'
        ? activity.dateLabelWidths.yesterday
        : activity.dateLabelWidths.dated;
  const lineWidth = contentWidth - labelWidth - activity.sectionHeaderGap;

  return (
    <HStack
      alignment="center"
      spacing={activity.sectionHeaderGap}
      modifiers={[frame({ maxWidth: Infinity })]}
    >
      <Text
        modifiers={[
          lineLimit(1),
          allowsTightening(true),
          minimumScaleFactor(0.78),
          frame({ width: labelWidth, alignment: 'leading' }),
          font({ size: activity.sectionHeaderFontSize, weight: 'medium' }),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {title}
      </Text>
      <Divider
        modifiers={[
          frame({ width: lineWidth, height: 1 }),
          background(colors.action),
          opacity(activity.sectionDividerOpacity),
        ]}
      />
    </HStack>
  );
}

/** Chronological grouped Activity list using the shared Home transaction card. */
export function ActivityTimeline({ sections }: ActivityTimelineProps) {
  const activity = screenTokens.activity;

  return (
    <Group modifiers={[frame({ width: activity.contentWidth, alignment: 'center' })]}>
      <SurfacePanel width={activity.panelWidth}>
        <VStack
          alignment="leading"
          spacing={0}
          modifiers={[
            padding({
              top: activity.panelPaddingTop,
              bottom: activity.panelPaddingBottom,
              horizontal: activity.panelPaddingHorizontal,
            }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
          ]}
        >
          {sections.map((section, sectionIndex) => (
            <VStack
              key={section.id}
              alignment="leading"
              spacing={activity.sectionHeaderToRows}
              modifiers={sectionIndex === 0 ? [] : [padding({ top: activity.sectionGap })]}
            >
              <DateSectionHeader title={section.title} />
              <VStack alignment="leading" spacing={activity.rowGap}>
                {section.items.map((item) => (
                  <ActivityTransactionRow key={item.id} item={item} />
                ))}
              </VStack>
            </VStack>
          ))}
        </VStack>
      </SurfacePanel>
    </Group>
  );
}
