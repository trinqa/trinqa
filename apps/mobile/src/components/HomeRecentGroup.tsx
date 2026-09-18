import { Group, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  padding,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useWindowDimensions } from 'react-native';

import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { homeRecentActivity } from '@/data/mocks/home';
import { useCompletedPayments } from '@/data/mocks/paymentActivity';
import { colors, componentTokens, homeTokens, spacing } from '@/theme';

/** Recent grouped card follows the reference's narrow outer inset and compact rows. */
export function HomeRecentGroup() {
  const { width: windowWidth } = useWindowDimensions();
  const completedPayments = useCompletedPayments();
  const shellWidth = windowWidth - spacing.screenHorizontal * 2;
  const recentActivity = [
    ...completedPayments.map((payment) => ({
      id: payment.id,
      title: payment.recipient.name,
      subtitle: 'Sent',
      amount: `-${payment.displayAmount}`,
      amountDirection: 'out' as const,
      date: payment.timestamp,
      symbol: payment.recipient.symbol,
    })),
    ...homeRecentActivity,
  ].slice(0, 3);

  return (
    <Group modifiers={[frame({ width: shellWidth, alignment: 'center' })]}>
      <VStack
        alignment="leading"
        spacing={homeTokens.recent.titleRowsGap}
        modifiers={[
          padding({
            top: homeTokens.recent.topPadding,
            bottom: homeTokens.recent.bottomPadding,
            horizontal: homeTokens.recent.horizontalPadding,
          }),
          background(
            colors.surface,
            shapes.roundedRectangle({ cornerRadius: componentTokens.surface.panelRadius }),
          ),
          strokeBorder({
            content: colors.borderStrong,
            style: { lineWidth: componentTokens.surface.borderWidth },
            shape: 'roundedRectangle',
            cornerRadius: componentTokens.surface.panelRadius,
          }),
          shadow({
            radius: componentTokens.surface.shadowRadius,
            y: componentTokens.surface.shadowY,
            color: componentTokens.surface.shadowColor,
          }),
          frame({ width: homeTokens.recent.width, alignment: 'leading' }),
        ]}
      >
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          Recent
        </Text>

        <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
          {recentActivity.map((item) => (
            <LayeredTransactionRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              amount={item.amount}
              meta={item.date}
              symbol={item.symbol}
              footerLeadingText="Completed"
              footerTrailingText="Details"
              onFooterPress={() => undefined}
            />
          ))}
        </VStack>
      </VStack>
    </Group>
  );
}
