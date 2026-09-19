import { Divider, HStack, Text } from '@expo/ui/swift-ui';
import {
  background,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  opacity,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, typography } from '@/theme';

interface DateSectionDividerProps {
  /** Retained for API compat — layout is now flexible (text natural width, divider fills rest). */
  contentWidth: number;
  label: string;
  modifiers?: ViewModifier[];
}

/** Shared date label and cyan rule used by Wallet and Activity timelines. */
export function DateSectionDivider({
  label,
  modifiers = [],
}: DateSectionDividerProps) {
  const divider = componentTokens.dateSectionDivider;

  return (
    <HStack
      alignment="center"
      spacing={divider.labelToLineGap}
      modifiers={[frame({ maxWidth: Infinity }), ...modifiers]}
    >
      {/*
        fixedSize() tells SwiftUI to use the text's intrinsic width so it never
        bleeds into the divider column. lineLimit(1) ensures a single line even
        for long locale dates like "Sep 12, 2026".
      */}
      <Text
        modifiers={[
          font({ size: typography.footnote, weight: 'medium' }),
          lineLimit(1),
          fixedSize(),
          foregroundStyle(colors.textSecondary),
        ]}
      >
        {label}
      </Text>
      <Divider
        modifiers={[
          frame({ maxWidth: Infinity, height: divider.lineHeight }),
          background(colors.action),
          opacity(divider.lineOpacity),
        ]}
      />
    </HStack>
  );
}
