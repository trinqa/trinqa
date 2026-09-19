import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { colors } from '@/theme';
import type { ActivityListItem } from '@/types';
import {
  transactionStatusColor,
  transactionStatusLabel,
  transactionStatusSymbol,
} from '@/domain/transactionPresentation';

interface ActivityTransactionRowProps {
  item: ActivityListItem;
  onPress: () => void;
}

/** Reference-matched Activity presentation of the shared layered transaction row. */
export function ActivityTransactionRow({ item, onPress }: ActivityTransactionRowProps) {
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
        isEarning ? colors.successMuted : isAmazon ? colors.merchantLogo : undefined
      }
      iconColor={isEarning ? colors.success : undefined}
      iconLetterColor={isAmazon ? colors.textInverse : undefined}
      iconAccentText={isAmazon ? '⌣' : undefined}
      iconAccentColor={isAmazon ? colors.merchantLogoAccent : undefined}
      footerLeadingText={transactionStatusLabel(item.status)}
      footerSymbol={transactionStatusSymbol(item.status)}
      footerLeadingColor={transactionStatusColor(item.status)}
      footerTrailingText="Details"
      onFooterPress={onPress}
      onPress={onPress}
      footerTrailingColor={colors.action}
    />
  );
}
