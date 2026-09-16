import { StyleSheet, View } from 'react-native';
import { Host, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';
import type { AccountSummary } from '@/types';

interface AccountCardStackProps {
  account: AccountSummary;
}

export function AccountCardStack({ account }: AccountCardStackProps) {
  return (
    <View style={styles.container}>
      <Host matchContents>
        <VStack
          spacing={4}
          alignment="leading"
          modifiers={[
            background(colors.cardLight),
            cornerRadius(radius.xl),
            padding({ horizontal: 18, vertical: 16 }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.caption, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {account.accountName}
          </Text>
        </VStack>
      </Host>

      <View style={styles.frontCard}>
        <Host matchContents>
          <VStack spacing={8} alignment="leading">
            <Text
              modifiers={[
                font({ size: typography.caption }),
                foregroundStyle('#AAAAAA'),
              ]}
            >
              {account.cardLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.balanceLarge, weight: 'bold' }),
                foregroundStyle(colors.surface),
              ]}
            >
              {account.displayCurrency}
              {account.balance}
            </Text>
          </VStack>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  frontCard: {
    marginTop: -28,
    backgroundColor: colors.cardDark,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
});
