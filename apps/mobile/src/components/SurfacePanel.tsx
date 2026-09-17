import { VStack } from '@expo/ui/swift-ui';
import { frame, type ViewModifier } from '@expo/ui/swift-ui/modifiers';

import { componentTokens } from '@/theme';
import { cardChromeModifiers } from '@/theme/swiftUi';

interface SurfacePanelProps {
  children: React.ReactNode;
  width: number;
  height?: number;
  spacing?: number;
  cornerRadius?: number;
  modifiers?: ViewModifier[];
}

/** Shared white surface with the exact Home stroke, radius and shadow recipe. */
export function SurfacePanel({
  children,
  width,
  height,
  spacing = 0,
  cornerRadius = componentTokens.surface.panelRadius,
  modifiers = [],
}: SurfacePanelProps) {
  return (
    <VStack
      alignment="leading"
      spacing={spacing}
      modifiers={[
        frame({ width, ...(height === undefined ? {} : { height }) }),
        ...cardChromeModifiers(cornerRadius),
        ...modifiers,
      ]}
    >
      {children}
    </VStack>
  );
}
