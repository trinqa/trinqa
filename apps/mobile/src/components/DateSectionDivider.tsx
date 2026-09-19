import { Divider, HStack, Text } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  opacity,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, typography } from '@/theme';

interface DateSectionDividerProps {
  contentWidth: number;
  label: string;
  modifiers?: ViewModifier[];
}

/** Shared date label and cyan rule used by Wallet and Activity timelines. */
export function DateSectionDivider({
  contentWidth,
  label,
  modifiers = [],
}: DateSectionDividerProps) {
  const divider = componentTokens.dateSectionDivider;
  const labelWidth =
    label === 'Today'
      ? divider.labelWidths.today
      : label === 'Yesterday'
        ? divider.labelWidths.yesterday
        : divider.labelWidths.dated;
  const lineWidth = contentWidth - labelWidth - divider.labelToLineGap;

  return (
    <HStack
      alignment="center"
      spacing={divider.labelToLineGap}
      modifiers={[frame({ maxWidth: Infinity }), ...modifiers]}
    >
      <Text
        modifiers={[
          font({ size: typography.footnote, weight: 'medium' }),
          lineLimit(1),
          frame({ width: labelWidth, alignment: 'leading' }),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Divider
        modifiers={[
          frame({ width: lineWidth, height: divider.lineHeight }),
          background(colors.action),
          opacity(divider.lineOpacity),
        ]}
      />
    </HStack>
  );
}
