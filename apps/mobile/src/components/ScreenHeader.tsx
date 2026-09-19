import {
  Button,
  HStack,
  Image,
  Menu,
  Spacer,
  Text,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, typography } from '@/theme';

interface ScreenHeaderProps {
  showBack?: boolean;
  title?: string;
  onBackPress?: () => void;
}

function headerIconModifiers() {
  return [
    frame({
      width: componentTokens.headerControl.size,
      height: componentTokens.headerControl.size,
    }),
    background(colors.surface, shapes.circle()),
    strokeBorder({
      content: colors.borderStrong,
      style: { lineWidth: componentTokens.surface.borderWidth },
      shape: 'circle' as const,
    }),
  ];
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
        ...headerIconModifiers(),
      ]}
    />
  );
}

function ProfileMenu() {
  const router = useRouter();

  return (
    <Menu
      label={(
        <ZStack modifiers={headerIconModifiers()}>
          <Image
            systemName="person.fill"
            size={componentTokens.headerControl.symbolSize}
            color={colors.textPrimary}
          />
        </ZStack>
      )}
      modifiers={[buttonStyle('plain'), accessibilityLabel('Profile')]}
    >
      <Button
        label="Account details"
        systemImage="doc.text"
        onPress={() => router.push('/account-details')}
      />
      <Button
        label="Settings"
        systemImage="gearshape"
        onPress={() => router.push('/settings')}
      />
    </Menu>
  );
}

export function ScreenHeader({
  showBack = false,
  title,
  onBackPress,
}: ScreenHeaderProps) {
  const isPageHeader = !showBack;

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
      ) : null}

      {title ? (
        <Text
          modifiers={[
            font({
              size: isPageHeader ? typography.pageTitle : typography.sectionTitle,
              weight: isPageHeader ? 'bold' : 'semibold',
            }),
            foregroundStyle(colors.textPrimary),
            lineLimit(1),
          ]}
        >
          {title}
        </Text>
      ) : null}

      <Spacer />

      {isPageHeader ? <ProfileMenu /> : null}
    </HStack>
  );
}
