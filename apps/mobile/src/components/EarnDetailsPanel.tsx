import { VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { EarnSegmentPicker } from '@/components/EarnSegmentPicker';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { SurfacePanel } from '@/components/SurfacePanel';
import { colors, componentTokens, screenTokens } from '@/theme';
import type { EarnListItem, EarnSegment } from '@/types';

interface EarnDetailsPanelProps {
  segment: EarnSegment;
  onChange: (segment: EarnSegment) => void;
  items: EarnListItem[];
}

export function EarnDetailsPanel({ segment, onChange, items }: EarnDetailsPanelProps) {
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
          {items.map((item) => {
            const isEarning = item.iconStyle === 'earning';

            return (
              <LayeredTransactionRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                amount={item.amount}
                meta={item.meta}
                symbol={item.symbol}
                iconBackgroundColor={isEarning ? colors.earningMuted : undefined}
                iconColor={isEarning ? colors.earning : undefined}
                footerLeadingText={item.footerLeadingText}
                footerTrailingText={item.footerTrailingText}
                footerSymbol={
                  item.action === 'manage-strategy'
                    ? 'chart.line.uptrend.xyaxis'
                    : 'checkmark.circle.fill'
                }
                footerTrailingColor={colors.action}
                onFooterPress={() => {
                  // Prepared for the future Manage Strategy / detail destination.
                }}
              />
            );
          })}
        </VStack>
      </VStack>
    </SurfacePanel>
  );
}
