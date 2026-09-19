import { Platform, type ViewStyle } from 'react-native';

import { primitiveShadow } from '@trinqa/tokens';

export const shortcutShadow = {
  radius: primitiveShadow.shortcut.radius,
  y: primitiveShadow.shortcut.offsetY,
  color: primitiveShadow.shortcut.color,
} as const;

export const cardShadow: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: primitiveShadow.card.color,
      shadowOffset: { width: primitiveShadow.card.offsetX, height: primitiveShadow.card.offsetY },
      shadowOpacity: primitiveShadow.card.opacity,
      shadowRadius: primitiveShadow.card.radius,
    },
    default: {
      elevation: primitiveShadow.card.androidElevation,
    },
  }) ?? {};
