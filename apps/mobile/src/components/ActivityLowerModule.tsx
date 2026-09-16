import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  frame,
  offset,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { ActivitySegmentPicker } from '@/components/ActivitySegmentPicker';
import { ActivityTransactionRow } from '@/components/ActivityTransactionRow';
import { colors } from '@/theme';
import type { ActivityListItem, ActivitySegment } from '@/types';

const OUTER_WIDTH = 366;
const INNER_WIDTH = 396;
const CONTENT_WIDTH = 364;
/** Nominal 16pt; +5 leading inset aligns 364pt content to x≈19 on Release/Expo. */
const CONTENT_GUTTER = (INNER_WIDTH - CONTENT_WIDTH) / 2 + 5;
const BLEED_OFFSET = -15;
const PICKER_TO_ROWS_GAP = 29;
const ROW_GAP = 47;

interface ActivityLowerModuleProps {
  segment: ActivitySegment;
  onChange: (segment: ActivitySegment) => void;
  items: ActivityListItem[];
}

/** Grouped white module: segmented picker + inset transaction cards. */
export function ActivityLowerModule({
  segment,
  onChange,
  items,
}: ActivityLowerModuleProps) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: OUTER_WIDTH, maxWidth: Infinity })]}
    >
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[frame({ width: INNER_WIDTH }), offset({ x: BLEED_OFFSET })]}
      >
        <VStack
          spacing={0}
          modifiers={[
            frame({ width: INNER_WIDTH }),
            background(colors.surface, shapes.roundedRectangle({ cornerRadius: 16 })),
            border({ content: colors.border, width: 1 }),
          ]}
        >
          <HStack alignment="top" modifiers={[frame({ width: INNER_WIDTH })]}>
            <VStack modifiers={[frame({ width: CONTENT_GUTTER, height: 1 })]}>
              <Text>{' '}</Text>
            </VStack>
            <VStack
              alignment="leading"
              spacing={PICKER_TO_ROWS_GAP}
              modifiers={[
                frame({ width: CONTENT_WIDTH }),
                padding({ top: 8, bottom: 24 }),
              ]}
            >
              <ActivitySegmentPicker segment={segment} onChange={onChange} />

              <VStack alignment="leading" spacing={ROW_GAP} modifiers={[frame({ width: CONTENT_WIDTH })]}>
                {items.map((item) => (
                  <ActivityTransactionRow
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    amount={item.amount}
                  />
                ))}
              </VStack>
            </VStack>
          </HStack>
        </VStack>
      </VStack>
    </VStack>
  );
}
