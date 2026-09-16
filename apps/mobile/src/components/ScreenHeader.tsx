import {
  Button,
  Group,
  HStack,
  Image,
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
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { Image as RNImage, StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors } from '@/theme';

interface ScreenHeaderProps {
  showBack?: boolean;
  title?: string;
  showMenu?: boolean;
}

function HeaderIconButton({
  symbol,
  onPress,
}: {
  symbol: SFSymbol;
  onPress?: () => void;
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        frame({ width: 44, height: 44 }),
        background(colors.surface, shapes.circle()),
      ]}
    >
      <Image systemName={symbol} size={17} color={colors.textPrimary} />
    </Button>
  );
}

function ProfileAvatar() {
  return (
    <Group modifiers={[frame({ width: 44, height: 44 })]}>
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
  title,
  showMenu = false,
}: ScreenHeaderProps) {
  return (
    <HStack
      alignment="center"
      spacing={8}
      modifiers={[frame({ maxWidth: Infinity, minHeight: 44 })]}
    >
      {showBack ? (
        <HeaderIconButton symbol="chevron.left" />
      ) : (
        <ProfileAvatar />
      )}

      {title ? (
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
      ) : null}

      <Spacer />

      {!showBack && !showMenu ? (
        <HStack spacing={8}>
          <HeaderIconButton symbol="headphones" />
          <ZStack alignment="topTrailing">
            <HeaderIconButton symbol="bell" />
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

      {showMenu ? <HeaderIconButton symbol="ellipsis" /> : null}
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
