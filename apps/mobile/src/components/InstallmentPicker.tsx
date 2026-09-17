import { Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { screenTokens } from '@/theme';
import type { InstallmentSegment } from '@/types';

interface InstallmentPickerProps {
  segment: InstallmentSegment;
  onChange: (segment: InstallmentSegment) => void;
}

/** Native SwiftUI segmented picker used by the Progress installment panel. */
export function InstallmentPicker({ segment, onChange }: InstallmentPickerProps) {
  const width = screenTokens.progress.lowerPanelWidth - screenTokens.progress.lowerPanelPadding * 2;

  return (
    <Picker
      selection={segment}
      onSelectionChange={onChange}
      modifiers={[
        frame({ width, height: screenTokens.progress.pickerHeight }),
        pickerStyle('segmented'),
      ]}
    >
      <Text modifiers={[tag('four')]}>4 Installment</Text>
      <Text modifiers={[tag('six')]}>6 Installment</Text>
    </Picker>
  );
}
