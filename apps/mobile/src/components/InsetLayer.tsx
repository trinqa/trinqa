import { HStack, VStack } from '@expo/ui/swift-ui';
import {
  background,
  frame,
  padding,
  shapes,
  strokeBorder,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens } from '@/theme';

interface InsetLayerProps {
  children: React.ReactNode;
  axis?: 'horizontal' | 'vertical';
  height?: number;
  spacing?: number;
  modifiers?: ViewModifier[];
}

/** Shared muted layer that holds elevated white controls and cards. */
export function InsetLayer({
  children,
  axis = 'vertical',
  height,
  spacing = componentTokens.layer.gap,
  modifiers = [],
}: InsetLayerProps) {
  const layerModifiers = [
    padding({ all: componentTokens.layer.inset }),
    frame({ maxWidth: Infinity, ...(height === undefined ? {} : { height }) }),
    background(
      colors.surfaceLayer,
      shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius }),
    ),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'roundedRectangle' as const,
      cornerRadius: componentTokens.surface.cardRadius,
    }),
    ...modifiers,
  ];

  if (axis === 'horizontal') {
    return (
      <HStack alignment="center" spacing={spacing} modifiers={layerModifiers}>
        {children}
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={spacing} modifiers={layerModifiers}>
      {children}
    </VStack>
  );
}
