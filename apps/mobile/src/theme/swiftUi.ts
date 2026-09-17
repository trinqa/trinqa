import {
  background,
  clipShape,
  font,
  foregroundStyle,
  padding,
  shadow,
  shapes,
  strokeBorder,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, radius, spacing, typography } from '@/theme';

export function bodyTextModifiers(
  weight: 'regular' | 'medium' | 'semibold' | 'bold' = 'regular',
): ViewModifier[] {
  return [
    font({ size: typography.body, weight }),
    foregroundStyle(colors.textPrimary),
  ];
}

export function captionTextModifiers(
  weight: 'regular' | 'medium' | 'semibold' = 'regular',
  color: string = colors.textSecondary,
): ViewModifier[] {
  return [font({ size: typography.caption, weight }), foregroundStyle(color)];
}

export function microTextModifiers(
  weight: 'regular' | 'medium' | 'semibold' | 'bold' = 'regular',
  color: string = colors.textSecondary,
): ViewModifier[] {
  return [font({ size: typography.micro, weight }), foregroundStyle(color)];
}

export function sectionTitleModifiers(): ViewModifier[] {
  return [
    font({ size: typography.sectionTitle, weight: 'semibold' }),
    foregroundStyle(colors.textPrimary),
  ];
}

export function cardChromeModifiers(cornerRadius: number = radius.xl): ViewModifier[] {
  return [
    background(colors.surface, shapes.roundedRectangle({ cornerRadius })),
    clipShape('roundedRectangle', cornerRadius),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'roundedRectangle',
      cornerRadius,
    }),
    shadow({
      radius: componentTokens.surface.shadowRadius,
      y: componentTokens.surface.shadowY,
      color: componentTokens.surface.shadowColor,
    }),
  ];
}

export function cardSurfaceModifiers(cornerRadius: number = radius.xl): ViewModifier[] {
  return [...cardChromeModifiers(cornerRadius), padding({ all: spacing.cardPadding })];
}
