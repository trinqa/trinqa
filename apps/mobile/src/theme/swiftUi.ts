import {
  accessibilityHint,
  accessibilityLabel,
  background,
  clipShape,
  contentShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
  strokeBorder,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, radius, spacing, typography } from '@/theme';

type HitShape = 'rectangle' | 'circle' | 'roundedRectangle';

/**
 * Shared a11y + hit-testing for custom-content SwiftUI buttons.
 * `contentShape` is what makes Spacer / empty padding actually tappable.
 */
export function hitTargetModifiers({
  label,
  hint,
  minSize = false,
  shape = 'rectangle',
  cornerRadius,
}: {
  label: string;
  hint?: string;
  /** Grow the hit box to 44pt when the visible control is smaller. */
  minSize?: boolean;
  shape?: HitShape;
  cornerRadius?: number;
}): ViewModifier[] {
  const size = componentTokens.tapTarget.size;
  const shapeModifier =
    shape === 'circle'
      ? contentShape(shapes.circle())
      : shape === 'roundedRectangle'
        ? contentShape(
            shapes.roundedRectangle({
              cornerRadius: cornerRadius ?? componentTokens.surface.cardRadius,
            }),
          )
        : contentShape(shapes.rectangle());

  return [
    accessibilityLabel(label),
    ...(hint ? [accessibilityHint(hint)] : []),
    ...(minSize ? [frame({ minWidth: size, minHeight: size })] : []),
    shapeModifier,
  ];
}

export function bodyTextModifiers(
  weight: 'medium' | 'semibold' | 'bold' = 'medium',
): ViewModifier[] {
  return [
    font({ size: typography.body, weight }),
    foregroundStyle(colors.textPrimary),
  ];
}

export function captionTextModifiers(
  weight: 'medium' | 'semibold' = 'medium',
  color: string = colors.textSecondary,
): ViewModifier[] {
  return [font({ size: typography.caption, weight }), foregroundStyle(color)];
}

export function microTextModifiers(
  weight: 'medium' | 'semibold' | 'bold' = 'medium',
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

export function cardChromeModifiers(cornerRadius: number = radius.panel): ViewModifier[] {
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

export function cardSurfaceModifiers(cornerRadius: number = radius.panel): ViewModifier[] {
  return [...cardChromeModifiers(cornerRadius), padding({ all: spacing.cardPadding })];
}
