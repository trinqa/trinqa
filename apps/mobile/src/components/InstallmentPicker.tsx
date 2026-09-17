import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { screenTokens } from '@/theme';
import type { InstallmentSegment } from '@/types';

const INSTALLMENT_OPTIONS = [
  { label: '4 Installment', value: 'four' },
  { label: '6 Installment', value: 'six' },
] as const;

interface InstallmentPickerProps {
  segment: InstallmentSegment;
  onChange: (segment: InstallmentSegment) => void;
}

/** Native SwiftUI segmented picker used by the Progress installment panel. */
export function InstallmentPicker({ segment, onChange }: InstallmentPickerProps) {
  const width = screenTokens.progress.lowerPanelWidth - screenTokens.progress.lowerPanelPadding * 2;

  return (
    <NativeSegmentedControl
      accessibilityLabel="Installment period"
      value={segment}
      onChange={onChange}
      options={INSTALLMENT_OPTIONS}
      width={width}
      height={screenTokens.progress.pickerHeight}
    />
  );
}
