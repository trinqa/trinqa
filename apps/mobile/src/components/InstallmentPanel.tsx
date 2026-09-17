import { VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { InstallmentPicker } from '@/components/InstallmentPicker';
import { LayeredTransactionRow } from '@/components/LayeredTransactionRow';
import { SurfacePanel } from '@/components/SurfacePanel';
import { componentTokens, screenTokens } from '@/theme';
import type { InstallmentItem, InstallmentSegment } from '@/types';

interface InstallmentPanelProps {
  segment: InstallmentSegment;
  onChange: (segment: InstallmentSegment) => void;
  items: InstallmentItem[];
}

export function InstallmentPanel({ segment, onChange, items }: InstallmentPanelProps) {
  const progress = screenTokens.progress;

  return (
    <SurfacePanel width={progress.lowerPanelWidth}>
      <VStack
        alignment="leading"
        spacing={progress.pickerToRowsGap}
        modifiers={[
          padding({
            top: 14,
            bottom: 24,
            horizontal: progress.lowerPanelPadding,
          }),
        ]}
      >
        <InstallmentPicker segment={segment} onChange={onChange} />

        <VStack alignment="leading" spacing={componentTokens.transactionRow.rowGap}>
          {items.map((item) => (
            <LayeredTransactionRow
              key={item.id}
              title={item.title}
              subtitle={item.merchant}
              amount={item.amount}
              meta={item.dueDate}
              symbol={item.symbol}
              footerLeadingText={item.installment}
              footerTrailingText="Pay Now"
              footerSymbol="clock.fill"
              onFooterPress={() => undefined}
            />
          ))}
        </VStack>
      </VStack>
    </SurfacePanel>
  );
}
