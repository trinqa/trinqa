import { VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { EarnSegmentPicker } from '@/components/EarnSegmentPicker';
import { FlowEmptyState } from '@/components/FlowStates';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { SurfacePanel } from '@/components/SurfacePanel';
import { transactionStatusColor, transactionStatusSymbol } from '@/domain/transactionPresentation';
import { colors, componentTokens, screenTokens } from '@/theme';
import type { EarnListItem, EarnSegment } from '@/types';

interface EarnDetailsPanelProps {
  segment: EarnSegment;
  onChange: (segment: EarnSegment) => void;
  items: EarnListItem[];
  onManageStrategy: () => void;
  onSelectTransaction: (id: string) => void;
}

export function EarnDetailsPanel({
  segment,
  onChange,
  items,
  onManageStrategy,
  onSelectTransaction,
}: EarnDetailsPanelProps) {
  const earn = screenTokens.earn;

  return (
    <SurfacePanel width={earn.lowerPanelWidth}>
      <VStack
        alignment="leading"
        spacing={earn.pickerToRowsGap}
        modifiers={[
          padding({
            top: 14,
            bottom: 24,
            horizontal: earn.lowerPanelPadding,
          }),
        ]}
      >
        <EarnSegmentPicker segment={segment} onChange={onChange} />

        <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
          {items.length === 0 ? (
            <FlowEmptyState
              title="No earnings yet"
              subtitle="Once your money starts growing, the payouts land here."
            />
          ) : null}
          {items.map((item) => {
            const isEarning = item.iconStyle === 'earning';
            const onPress =
              item.action === 'manage-strategy'
                ? onManageStrategy
                : () => onSelectTransaction(item.id);

            return (
              <LayeredTransactionRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                amount={item.amount}
                meta={item.meta}
                symbol={item.symbol}
                iconBackgroundColor={isEarning ? colors.successMuted : undefined}
                iconColor={isEarning ? colors.success : undefined}
                amountColor={isEarning ? colors.success : undefined}
                footerLeadingText={item.footerLeadingText}
                footerTrailingText={item.footerTrailingText}
                footerSymbol={
                  item.action === 'manage-strategy'
                    ? 'chart.line.uptrend.xyaxis'
                    : item.status
                      ? transactionStatusSymbol(item.status)
                      : 'checkmark.circle.fill'
                }
                footerLeadingColor={
                  item.status ? transactionStatusColor(item.status) : undefined
                }
                footerTrailingColor={colors.action}
                onFooterPress={onPress}
                onPress={onPress}
              />
            );
          })}
        </VStack>
      </VStack>
    </SurfacePanel>
  );
}
