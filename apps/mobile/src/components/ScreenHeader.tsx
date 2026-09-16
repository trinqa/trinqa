import { Image, StyleSheet, View } from 'react-native';
import { Host, HStack, Image as SwiftUIImage, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';

interface ScreenHeaderProps {
  showBack?: boolean;
  title?: string;
  showMenu?: boolean;
}

function HeaderIconButton({
  symbol,
  accessibilityLabel,
}: {
  symbol: 'headphones' | 'bell' | 'chevron.left' | 'ellipsis';
  accessibilityLabel: string;
}) {
  return (
    <Host matchContents>
      <SwiftUIImage
        systemName={symbol}
        size={16}
        color={colors.textPrimary}
        modifiers={[
          frame({ width: 36, height: 36 }),
          background(colors.surface),
          cornerRadius(radius.pill),
        ]}
      />
    </Host>
  );
}

export function ScreenHeader({
  showBack = false,
  title,
  showMenu = false,
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <Host matchContents>
        <HStack spacing={12} alignment="center">
          {showBack ? (
            <HeaderIconButton symbol="chevron.left" accessibilityLabel="Back" />
          ) : (
            <View style={styles.avatar}>
              <Image
                source={require('../../assets/images/trinqa-hand.jpeg')}
                style={styles.avatarImage}
                accessibilityLabel="Trinqa profile"
              />
            </View>
          )}

          {title ? (
            <Text
              modifiers={[
                font({ size: typography.sectionTitle, weight: 'semibold' }),
                foregroundStyle(colors.textPrimary),
              ]}
            >
              {title}
            </Text>
          ) : null}

          <Spacer />

          {!showBack && !showMenu ? (
            <HStack spacing={10}>
              <HeaderIconButton symbol="headphones" accessibilityLabel="Support" />
              <View>
                <HeaderIconButton symbol="bell" accessibilityLabel="Notifications" />
                <View style={styles.badge}>
                  <Host matchContents>
                    <Text
                      modifiers={[
                        font({ size: 10, weight: 'bold' }),
                        foregroundStyle(colors.surface),
                      ]}
                    >
                      4
                    </Text>
                  </Host>
                </View>
              </View>
            </HStack>
          ) : null}

          {showMenu ? (
            <HeaderIconButton symbol="ellipsis" accessibilityLabel="More options" />
          ) : null}
        </HStack>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: 40,
    height: 40,
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.notificationBadge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
