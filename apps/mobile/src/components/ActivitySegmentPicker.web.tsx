import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';
import type { ActivitySegment } from '@/types';

interface ActivitySegmentPickerProps {
  segment: ActivitySegment;
  onChange: (segment: ActivitySegment) => void;
}

/** Web fallback segmented control until SwiftUI Host is available. */
export function ActivitySegmentPicker({
  segment,
  onChange,
}: ActivitySegmentPickerProps) {
  const options: Array<{ id: ActivitySegment; label: string }> = [
    { id: 'payments', label: 'Payments' },
    { id: 'earnings', label: 'Earnings' },
  ];

  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = segment === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.id)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: 4,
    width: '100%',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
