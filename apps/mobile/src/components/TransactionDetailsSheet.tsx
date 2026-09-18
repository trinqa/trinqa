import { useState } from 'react';

import {
  BottomSheet,
  DisclosureGroup,
  Divider,
  Group,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';

import { FlowInfoRow, SecondaryActionButton } from '@/components/FlowControls';
import { formatSignedMoney, formatMoney } from '@/domain/money';
import { transactionStatusLabel, transactionTimestamp } from '@/domain/transactionPresentation';
import { colors, typography } from '@/theme';
import type { Transaction } from '@/types';

function transactionTypeLabel(transaction: Transaction) {
  const labels: Record<Transaction['type'], string> = {
    payment: 'Payment',
    received: 'Received',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    'yield-earned': 'Yield earned',
    'added-to-earning': 'Added to earning',
    'returned-to-available': 'Returned to available',
    rebalance: 'Strategy change',
  };
  return labels[transaction.type];
}

export function TransactionDetailsSheet({
  anchor,
  transaction,
  onDismiss,
}: {
  anchor: React.ReactElement;
  transaction: Transaction | null;
  onDismiss: () => void;
}) {
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  return (
    <BottomSheet
      isPresented={transaction !== null}
      onIsPresentedChange={(isPresented) => {
        if (!isPresented) {
          setAdvancedExpanded(false);
          onDismiss();
        }
      }}
      anchor={anchor}
    >
      <Group
        modifiers={[
          presentationDetents([{ height: 590 }]),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        {transaction ? (
          <VStack alignment="leading" spacing={12} modifiers={[padding({ top: 18, bottom: 14, horizontal: 18 })]}>
            <VStack alignment="leading" spacing={4}>
              <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
                Transaction Details
              </Text>
              <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
                {transaction.title}
              </Text>
            </VStack>

            <Divider />
            <FlowInfoRow label="Type" value={transactionTypeLabel(transaction)} />
            <FlowInfoRow
              label="Amount"
              value={formatSignedMoney(transaction.amount, transaction.currency, transaction.direction)}
              emphasized
            />
            <FlowInfoRow label="Status" value={transactionStatusLabel(transaction.status)} />
            <FlowInfoRow label="Date / time" value={transactionTimestamp(transaction)} />
            {transaction.recipient ? <FlowInfoRow label="Recipient" value={transaction.recipient} /> : null}
            {transaction.source ? <FlowInfoRow label="Source" value={transaction.source} /> : null}
            {transaction.fee ? (
              <FlowInfoRow label="Fee" value={formatMoney(transaction.fee.amount, transaction.fee.currency)} />
            ) : null}
            {transaction.arrival ? <FlowInfoRow label="Arrival" value={transaction.arrival} /> : null}

            <Divider />
            <DisclosureGroup
              label="Advanced details"
              isExpanded={advancedExpanded}
              onIsExpandedChange={setAdvancedExpanded}
            >
              <VStack alignment="leading" spacing={10} modifiers={[padding({ top: 8 })]}>
                <FlowInfoRow label="Network" value={transaction.routeDetails?.network ?? 'Not available'} />
                <FlowInfoRow label="Transaction hash" value={transaction.routeDetails?.transactionHash ?? 'Pending backend'} />
                <FlowInfoRow label="Provider / route" value={transaction.routeDetails?.provider ?? 'Automatic'} />
              </VStack>
            </DisclosureGroup>

            <SecondaryActionButton label="Close" onPress={onDismiss} />
          </VStack>
        ) : null}
      </Group>
    </BottomSheet>
  );
}
