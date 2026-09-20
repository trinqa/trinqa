import {
  accessibilityHint,
  accessibilityLabel,
  background,
  clipShape,
  contentShape,
  createModifier,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
  strokeBorder,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, motion, radius, spacing, typography } from '@/theme';

/** Native ButtonStyle registered by `modules/trinqa-press`. */
export function pressFeedback(kind: 'full' | 'opacity'): ViewModifier {
  return createModifier('pressFeedback', {
    scale: motion.press.scale,
    opacity: motion.press.opacity,
    durationIn: motion.press.duration / 1000,
    durationOut: motion.press.releaseDuration / 1000,
    includeScale: kind === 'full',
  });
}

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
  press,
}: {
  label: string;
  hint?: string;
  /** Grow the hit box to 44pt when the visible control is smaller. */
  minSize?: boolean;
  shape?: HitShape;
  cornerRadius?: number;
  /** Omit on system Menu / Picker / bordered buttons. */
  press?: 'full' | 'opacity';
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
    ...(press ? [pressFeedback(press)] : []),
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
