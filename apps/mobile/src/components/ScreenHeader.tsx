import {
  Button,
  Group,
  HStack,
  RNHostView,
  Spacer,
  Text,
  ZStack,
} from '@expo/ui/swift-ui';
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
import { Image as RNImage, StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens } from '@/theme';

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
  return (
    <Group
      modifiers={[
        frame({
          width: componentTokens.headerControl.size,
          height: componentTokens.headerControl.size,
        }),
      ]}
    >
      <RNHostView matchContents={false}>
        <RNImage
          source={require('../../assets/images/trinqa-hand.jpeg')}
          style={styles.avatarImage}
          accessibilityLabel="Trinqa profile"
        />
      </RNHostView>
    </Group>
  );
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
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
      ) : null}

      <Spacer />

      {!showBack && !showMenu ? (
        <HStack spacing={componentTokens.headerControl.gap}>
          <HeaderIconButton label="Support" symbol="headphones" />
          <ZStack alignment="topTrailing">
            <HeaderIconButton label="Notifications, 4 unread" symbol="bell" />
            <Text
              modifiers={[
                font({ size: 10, weight: 'bold' }),
                foregroundStyle(colors.surface),
                frame({ width: 16, height: 16 }),
                background(colors.notificationBadge, shapes.circle()),
              ]}
            >
              4
            </Text>
          </ZStack>
        </HStack>
      ) : null}

      {showMenu ? <HeaderIconButton label="More options" symbol="ellipsis" /> : null}
    </HStack>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
