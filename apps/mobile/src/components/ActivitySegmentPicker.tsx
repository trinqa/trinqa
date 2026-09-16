import { Picker, Text, VStack } from '@expo/ui/swift-ui';
import { background, frame, pickerStyle, shapes, tag } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme';
import type { ActivitySegment } from '@/types';

interface ActivitySegmentPickerProps {
  segment: ActivitySegment;
  onChange: (segment: ActivitySegment) => void;
}

/** Native segmented control in a 44pt track slot (iOS SwiftUI). */
export function ActivitySegmentPicker({
  segment,
  onChange,
}: ActivitySegmentPickerProps) {
  return (
    <VStack
      alignment="center"
      modifiers={[
        frame({ width: 364, height: 44, maxWidth: Infinity }),
        background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: 10 })),
      ]}
    >
      <Picker
        selection={segment}
        onSelectionChange={onChange}
        modifiers={[frame({ width: 364, maxWidth: Infinity, height: 44 }), pickerStyle('segmented')]}
      >
        <Text modifiers={[tag('payments')]}>Payments</Text>
        <Text modifiers={[tag('earnings')]}>Earnings</Text>
      </Picker>
    </VStack>
  );
}
