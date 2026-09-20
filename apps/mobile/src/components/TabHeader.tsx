import { Button, HStack, Menu, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { colors, componentTokens, typography } from '@/theme';

interface TabHeaderProps {
  title: string;
}

/**
 * Chrome for the three tab roots. Flow screens keep `ScreenHeader`, which is a
 * different shape entirely: a back button and a 17pt task title.
 *
 * The title carries the weight here, so the only control is the profile circle,
 * and everything it owns lives behind it in a menu. Support and notification
 * icons are deliberately absent — three neutral circles competing at the top of
 * every tab is what made the old header read as chrome instead of a place.
 */
export function TabHeader({ title }: TabHeaderProps) {
  const router = useRouter();

  return (
    <HStack
      alignment="center"
      spacing={componentTokens.headerControl.gap}
      modifiers={[frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size })]}
    >
      <Text
        modifiers={[
          font({ size: typography.pageTitle, weight: 'bold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {title}
      </Text>

      <Spacer />

      <Menu
        label={
          <Button
            label="Profile"
            systemImage="person.fill"
            modifiers={[buttonStyle('plain'), labelStyle('iconOnly')]}
          />
        }
        modifiers={[
          buttonStyle('plain'),
          accessibilityLabel('Profile'),
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
      >
        <Button
          label="Account details"
          systemImage="person.text.rectangle"
          onPress={() => router.push('/account-details')}
        />
        <Button
          label="Settings"
          systemImage="gearshape"
          onPress={() => router.push('/settings')}
        />
      </Menu>
    </HStack>
  );
}
