import { NativeSegmentedControl } from '@/components/NativeSegmentedControl';
import { screenTokens } from '@/theme';
import type { ActivitySegment } from '@/types';

const ACTIVITY_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'payments' },
  { label: 'Earnings', value: 'earnings' },
] as const;

interface ActivitySegmentPickerProps {
  segment: ActivitySegment;
  onChange: (segment: ActivitySegment) => void;
}

/** Activity filter backed by the shared native SwiftUI segmented picker. */
export function ActivitySegmentPicker({
  segment,
  onChange,
}: ActivitySegmentPickerProps) {
  return (
    <NativeSegmentedControl
      accessibilityLabel="Activity type"
      value={segment}
      onChange={onChange}
      options={ACTIVITY_OPTIONS}
      width={screenTokens.activity.contentWidth}
      height={screenTokens.activity.segmentHeight}
    />
  );
}
