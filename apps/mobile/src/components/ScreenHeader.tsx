import { Button, HStack, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
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

function HeaderIconButton({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: SFSymbol;
  onPress?: () => void;
}) {
  return (
    <Button
      label={label}
      systemImage={symbol}
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        labelStyle('iconOnly'),
        ...hitTargetModifiers({ label, shape: 'circle' }),
        frame({
          width: componentTokens.headerControl.size,
          height: componentTokens.headerControl.size,
        }),
        background(colors.surface, shapes.circle()),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'circle',
        }),
      ]}
    />
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
