import { StyleSheet, View } from 'react-native';
import { Host, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

import { colors, radius, typography } from '@/theme';
import type { AccountSummary } from '@/types';

interface AccountCardStackProps {
  account: AccountSummary;
}

export function AccountCardStack({ account }: AccountCardStackProps) {
  return (
    <View style={styles.sleeve}>
      <View style={styles.backCard}>
        <Host matchContents>
          <Text
            modifiers={[
              font({ size: typography.micro, weight: 'medium' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {account.accountName}
          </Text>
        </Host>
      </View>

      <View style={styles.frontCard}>
        <Host matchContents>
          <VStack spacing={10} alignment="leading">
            <Text
              modifiers={[
                font({ size: typography.caption }),
                foregroundStyle('#B0B0B0'),
              ]}
            >
              {account.cardLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: typography.balanceHero, weight: 'bold' }),
                foregroundStyle(colors.surface),
              ]}
            >
              {account.displayCurrency} {account.balance}
            </Text>
          </VStack>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sleeve: {
    backgroundColor: colors.cardSleeve,
    borderRadius: radius.xxl,
    padding: 14,
    minHeight: 168,
    justifyContent: 'flex-end',
  },
  backCard: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    height: 56,
    backgroundColor: colors.cardLight,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  frontCard: {
    backgroundColor: colors.cardDark,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 22,
    minHeight: 112,
    justifyContent: 'center',
  },
});
