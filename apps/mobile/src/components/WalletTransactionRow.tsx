import { HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors, screenTokens, typography } from '@/theme';
import type { WalletTransactionItem } from '@/types';

const ICON_BACKGROUNDS = {
  neutral: '#050505',
  accent: '#FF6A00',
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
          background(ICON_BACKGROUNDS[item.iconStyle], shapes.circle()),
        ]}
      >
        <Image systemName={item.symbol} size={18} color={colors.surface} />
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
          {item.detail}
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
