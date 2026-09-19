import { useState } from 'react';

import {
  BottomSheet,
  DisclosureGroup,
  Divider,
  Group,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  padding,
  presentationDragIndicator,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { getTransactionDetails } from '@/domain/transactionPresentation';
import { colors, typography } from '@/theme';
import type { Transaction, TransactionStatus } from '@/types';

function statusColor(status: TransactionStatus) {
  if (status === 'failed') return colors.danger;
  if (status === 'pending') return colors.pending;
  return colors.success;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack alignment="firstTextBaseline" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
      <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
        {label}
      </Text>
      <Spacer />
      <Text
        modifiers={[
          layoutPriority(1),
          font({ size: typography.caption, weight: 'medium' }),
          foregroundStyle(colors.textPrimary),
          lineLimit(1),
        ]}
      >
        {value}
      </Text>
    </HStack>
  );
}

function AdvancedDetails({ rows }: { rows: { label: string; value: string }[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <DisclosureGroup isExpanded={isExpanded} onIsExpandedChange={setIsExpanded}>
      <DisclosureGroup.Label>
        <Text
          modifiers={[
            font({ size: typography.caption, weight: 'medium' }),
            foregroundStyle(colors.action),
          ]}
        >
          Advanced details
        </Text>
      </DisclosureGroup.Label>
      <VStack alignment="leading" spacing={8} modifiers={[padding({ top: 6 }), frame({ maxWidth: Infinity })]}>
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </VStack>
    </DisclosureGroup>
  );
}

function TransactionDetailsContent({ transaction }: { transaction: Transaction }) {
  const details = getTransactionDetails(transaction);
  const color = statusColor(details.status);

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        padding({ top: 16, bottom: 18, horizontal: 22 }),
        frame({ maxWidth: Infinity, alignment: 'leading' }),
        accessibilityLabel(`${details.title}, ${details.amount}, ${details.statusLabel}`),
      ]}
    >
      <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
        <ZStack
          modifiers={[
            frame({ width: 32, height: 32 }),
            background(colors.surfaceLayer, shapes.circle()),
          ]}
        >
          {details.symbol ? (
            <Image systemName={details.symbol} size={14} color={colors.textSecondary} />
          ) : (
            <Text modifiers={[font({ size: typography.caption, weight: 'semibold' }), foregroundStyle(colors.textSecondary)]}>
              {details.title.charAt(0).toUpperCase()}
            </Text>
          )}
        </ZStack>

        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text
            modifiers={[
              font({ size: typography.sectionTitle, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
              lineLimit(1),
            ]}
          >
            {details.title}
          </Text>
          {details.subtitle ? (
            <Text
              modifiers={[
                font({ size: typography.caption }),
                foregroundStyle(colors.textSecondary),
                lineLimit(1),
              ]}
            >
              {details.subtitle}
            </Text>
          ) : null}
        </VStack>

        <VStack alignment="trailing" spacing={2} modifiers={[layoutPriority(1)]}>
          <Text
            modifiers={[
              font({ size: typography.amountCurrency, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
              lineLimit(1),
            ]}
          >
            {details.amount}
          </Text>
          <HStack alignment="center" spacing={4}>
            <Image systemName={details.statusSymbol} size={12} color={color} />
            <Text modifiers={[font({ size: typography.caption }), foregroundStyle(color)]}>
              {details.statusLabel}
            </Text>
          </HStack>
        </VStack>
      </HStack>

      <Group modifiers={[padding({ top: 14, bottom: 10 })]}>
        <Divider />
      </Group>

      <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        {details.rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </VStack>

      {details.advanced.length > 0 ? (
        <VStack alignment="leading" spacing={10} modifiers={[padding({ top: 12 }), frame({ maxWidth: Infinity })]}>
          <Divider />
          <AdvancedDetails rows={details.advanced} />
        </VStack>
      ) : null}
    </VStack>
  );
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
  const [presentedTransaction, setPresentedTransaction] = useState<Transaction | null>(null);

  if (transaction && transaction.id !== presentedTransaction?.id) {
    setPresentedTransaction(transaction);
  }

  const displayedTransaction = transaction ?? presentedTransaction;

  return (
    <BottomSheet
      isPresented={transaction !== null}
      onIsPresentedChange={(isPresented) => {
        if (!isPresented) onDismiss();
      }}
      onDismiss={() => setPresentedTransaction(null)}
      fitToContents
      anchor={anchor}
    >
      <Group modifiers={[presentationDragIndicator('visible')]}>
        {displayedTransaction ? (
          <TransactionDetailsContent key={displayedTransaction.id} transaction={displayedTransaction} />
        ) : null}
      </Group>
    </BottomSheet>
  );
}
