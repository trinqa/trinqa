import { Platform, type ViewStyle } from 'react-native';

export const cardShadow: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
    },
    default: {
      elevation: 3,
    },
  }) ?? {};
