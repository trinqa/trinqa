import { Group, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useWindowDimensions } from 'react-native';

import { HomeTransactionRow } from '@/components/HomeTransactionRow';
import { homeRecentActivity } from '@/data/mocks/home';
import { colors, spacing } from '@/theme';

const GROUP_VISUAL_WIDTH = 396;
const GROUP_TOP_PADDING = 19;
const TITLE_TO_ROWS_GAP = 22;
const ROW_GAP = 48;

/** Recent grouped card: 396pt visual centered in 366pt shell (15pt bleed each side). */
export function HomeRecentGroup() {
  const { width: windowWidth } = useWindowDimensions();
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;

  return (
    <Group modifiers={[frame({ width: shellWidth, alignment: 'center' })]}>
      <VStack
        alignment="leading"
        spacing={TITLE_TO_ROWS_GAP}
        modifiers={[
          padding({ top: GROUP_TOP_PADDING, bottom: 16, horizontal: 17 }),
          background(colors.surface, shapes.roundedRectangle({ cornerRadius: 16 })),
          border({ content: colors.border, width: 1 }),
          shadow({ radius: 8, y: 2, color: '#0000000A' }),
          frame({ width: GROUP_VISUAL_WIDTH, alignment: 'leading' }),
        ]}
      >
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          Recent
        </Text>

        <VStack alignment="leading" spacing={ROW_GAP}>
          {homeRecentActivity.map((item) => (
            <HomeTransactionRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              amount={item.amount}
              meta={item.date}
            />
          ))}
        </VStack>
      </VStack>
    </Group>
  );
}
