import { HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  offset,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, screenTokens, typography } from '@/theme';
import type { WalletTransactionItem } from '@/types';

const BRAND_COLORS = {
  amazon: '#050505',
  temu: '#FF6A00',
  apple: '#050505',
} as const;

export function WalletTransactionRow({ item }: { item: WalletTransactionItem }) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[
        frame({
          maxWidth: Infinity,
          height: screenTokens.wallet.transactionRowHeight,
          alignment: 'leading',
        }),
      ]}
    >
      <ZStack
        modifiers={[
          frame({ width: 42, height: 42 }),
          background(BRAND_COLORS[item.brand], shapes.circle()),
        ]}
      >
        {item.brand === 'apple' ? (
          <Image systemName="apple.logo" size={23} color={colors.surface} />
        ) : item.brand === 'amazon' ? (
          <ZStack>
            <Text
              modifiers={[
                font({ size: 27, weight: 'bold' }),
                foregroundStyle(colors.surface),
              ]}
            >
              a
            </Text>
            <Text
              modifiers={[
                font({ size: 13, weight: 'bold' }),
                foregroundStyle('#FF9900'),
                offset({ y: 12 }),
              ]}
            >
              ⌣
            </Text>
          </ZStack>
        ) : (
          <Text
            modifiers={[
              font({ size: 10, weight: 'bold' }),
              foregroundStyle(colors.surface),
            ]}
          >
            TEMU
          </Text>
        )}
      </ZStack>

      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text
          modifiers={[
            font({ size: typography.transactionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {item.title}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.transactionMeta }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {item.date}
        </Text>
      </VStack>

      <VStack alignment="trailing" spacing={2} modifiers={[layoutPriority(1), frame({ alignment: 'trailing' })]}>
        <Text
          modifiers={[
            font({ size: typography.transactionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {item.amount}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.transactionMeta }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {item.time}
        </Text>
      </VStack>
    </HStack>
  );
}
