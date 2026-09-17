import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { colors } from '@/theme';
import type { ActivityListItem } from '@/types';

interface ActivityTransactionRowProps {
  item: ActivityListItem;
}

/** Reference-matched Activity presentation of the shared layered transaction row. */
export function ActivityTransactionRow({ item }: ActivityTransactionRowProps) {
  const isEarning = item.iconStyle === 'earning';
  const isAmazon = item.iconStyle === 'amazon';

  return (
    <LayeredTransactionRow
      title={item.title}
      subtitle={item.subtitle}
      amount={item.amount}
      meta={item.timestamp}
      symbol={item.symbol}
      iconLetter={isAmazon ? 'a' : undefined}
      iconBackgroundColor={
        isEarning ? colors.earningMuted : isAmazon ? colors.merchantLogo : undefined
      }
      iconColor={isEarning ? colors.earning : undefined}
      iconLetterColor={isAmazon ? colors.surface : undefined}
      iconAccentText={isAmazon ? '⌣' : undefined}
      iconAccentColor={isAmazon ? colors.merchantLogoAccent : undefined}
      footerLeadingText="Completed"
      footerTrailingText="Details"
      onFooterPress={() => undefined}
      footerTrailingColor={colors.action}
    />
  );
}
