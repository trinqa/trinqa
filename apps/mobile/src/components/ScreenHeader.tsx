import { Button, HStack, Image, Spacer, Text, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';

interface ScreenHeaderProps {
  showBack?: boolean;
  showProfile?: boolean;
  title?: string;
  showMenu?: boolean;
  onBackPress?: () => void;
}

/**
 * 44pt circle whose whole disc is the hit target. `label` + `systemImage` +
 * `iconOnly` keeps the AX/hit box on the glyph (14pt) even when the chrome is 44.
 */
export function HeaderIconButton({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  onPress?: () => void;
}) {
  const size = componentTokens.headerControl.size;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({ label, shape: 'circle', press: 'opacity' }),
      ]}
    >
      <ZStack
        modifiers={[
          frame({ width: size, height: size }),
          background(colors.surface, shapes.circle()),
          strokeBorder({
            content: colors.borderStrong,
            style: { lineWidth: componentTokens.surface.borderWidth },
            shape: 'circle',
          }),
        ]}
      >
        <Image
          systemName={symbol}
          size={componentTokens.headerControl.symbolSize}
          color={colors.textPrimary}
        />
      </ZStack>
    </Button>
  );
}

function ProfileAvatar() {
  return <HeaderIconButton label="Profile" symbol="person.fill" />;
}

export function ScreenHeader({
  showBack = false,
  showProfile = true,
  title,
  showMenu = false,
  onBackPress,
}: ScreenHeaderProps) {
  return (
    <HStack
      alignment="center"
      spacing={title ? 18 : componentTokens.headerControl.gap}
      modifiers={[
        frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size }),
      ]}
    >
      {showBack ? (
        <HeaderIconButton label="Back" symbol="arrow.left" onPress={onBackPress} />
      ) : showProfile ? (
        <ProfileAvatar />
      ) : null}

      {title ? (
        <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
      ) : null}

      <Spacer />

      {showMenu ? <HeaderIconButton label="More options" symbol="ellipsis" /> : null}
    </HStack>
  );
}
