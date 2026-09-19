import { Picker, Text } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface NativeSegmentedControlProps<T extends string> {
  accessibilityLabel: string;
  height: number;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  value: T;
  width: number;
}

/** Shared native SwiftUI segmented picker used across tab screens. */
export function NativeSegmentedControl<T extends string>({
  accessibilityLabel,
  height,
  onChange,
  options,
  value,
  width,
}: NativeSegmentedControlProps<T>) {
  return (
    <Picker
      label={accessibilityLabel}
      selection={value}
      onSelectionChange={onChange}
      modifiers={[frame({ width, height }), pickerStyle('segmented')]}
    >
      {options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </Picker>
  );
}
