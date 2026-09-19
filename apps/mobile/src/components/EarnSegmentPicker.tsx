import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { screenTokens } from '@/theme';
import type { EarnSegment } from '@/types';

const EARN_OPTIONS = [
  { label: 'Earnings', value: 'earnings' },
  { label: 'Strategies', value: 'strategies' },
] as const;

interface EarnSegmentPickerProps {
  segment: EarnSegment;
  onChange: (segment: EarnSegment) => void;
}

/** Native SwiftUI segmented picker for the approved Earn lower panel. */
export function EarnSegmentPicker({ segment, onChange }: EarnSegmentPickerProps) {
  const width = screenTokens.earn.lowerPanelWidth - screenTokens.earn.lowerPanelPadding * 2;

  return (
    <NativeSegmentedControl
      accessibilityLabel="Earn content"
      value={segment}
      onChange={onChange}
      options={EARN_OPTIONS}
      width={width}
      height={screenTokens.earn.pickerHeight}
    />
  );
}
