import type { SFSymbol } from 'sf-symbols-typescript';

import { colors } from '@trinqa/tokens';
import { formatMoney, formatSignedMoney } from '@/domain/money';
import type {
  ActivityListItem,
  ActivitySegment,
  EarnListItem,
  Transaction,
  TransactionStatus,
} from '@/types';

const earningTypes = new Set<Transaction['type']>([
  'yield-earned',
  'added-to-earning',
  'returned-to-available',
  'rebalance',
]);

const walletTypes = new Set<Transaction['type']>([
  'deposit',
  'withdrawal',
  'added-to-earning',
  'returned-to-available',
]);

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function relativeDay(date: Date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (localDayKey(date) === localDayKey(now)) return 'today';
  if (localDayKey(date) === localDayKey(yesterday)) return 'yesterday';
  return date.toISOString().slice(0, 10);
}

export function transactionSection(transaction: Transaction) {
  const date = new Date(transaction.occurredAt);
  const id = relativeDay(date);
  const title =
    id === 'today'
      ? 'Today'
      : id === 'yesterday'
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
  return { id, title };
}

export function transactionTime(transaction: Transaction) {
  return new Date(transaction.occurredAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function transactionTimestamp(transaction: Transaction) {
  const section = transactionSection(transaction);
  return `${section.title}, ${transactionTime(transaction)}`;
}

export function transactionCategory(transaction: Transaction): Exclude<ActivitySegment, 'all'> {
  return earningTypes.has(transaction.type) ? 'earnings' : 'payments';
}

export function transactionStatusLabel(status: TransactionStatus) {
  return status === 'completed' ? 'Completed' : 'Uncompleted';
}

export function transactionTypeLabel(transaction: Transaction) {
  const labels: Record<Transaction['type'], string> = {
    payment: 'Payment',
    received: 'Received',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    'yield-earned': 'You earned',
    'added-to-earning': 'Moved to grow',
    'returned-to-available': 'Moved back',
    rebalance: 'Plan change',
  };
  return labels[transaction.type];
}

export function transactionStatusSymbol(status: TransactionStatus): SFSymbol {
  return status === 'completed' ? 'checkmark.circle.fill' : 'xmark.circle.fill';
}

export function transactionStatusColor(status: TransactionStatus) {
  return status === 'completed' ? colors.success : colors.danger;
}

export function compactTransactionHash(hash: string) {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

export interface TransactionDetailRow {
  label: string;
  value: string;
}

export interface TransactionDetailsPresentation {
  title: string;
  subtitle?: string;
  amount: string;
  status: TransactionStatus;
  statusLabel: string;
  statusSymbol: SFSymbol;
  symbol?: SFSymbol;
  rows: TransactionDetailRow[];
  advanced: TransactionDetailRow[];
}

function strategyValue(transaction: Transaction) {
  const subtitle = transaction.subtitle !== transaction.title ? transaction.subtitle : undefined;
  if (subtitle?.toLowerCase().includes('strategy')) return subtitle;
  if (transaction.source && transaction.source !== transaction.title) return transaction.source;
  return subtitle;
}

function headerSubtitle(transaction: Transaction, typeLabel: string, isStrategyMovement: boolean) {
  if (isStrategyMovement) return undefined;
  if (transaction.title !== typeLabel) return typeLabel;
  if (transaction.subtitle !== transaction.title) return transaction.subtitle;
  return undefined;
}

function pushUniqueRow(
  rows: TransactionDetailRow[],
  label: string,
  value: string | undefined,
  used: Set<string>,
) {
  if (!value || used.has(value)) return;
  used.add(value);
  rows.push({ label, value });
}

export function getTransactionDetails(transaction: Transaction): TransactionDetailsPresentation {
  const typeLabel = transactionTypeLabel(transaction);
  const isStrategyMovement = earningTypes.has(transaction.type);
  const subtitle = headerSubtitle(transaction, typeLabel, isStrategyMovement);
  const used = new Set<string>([transaction.title, subtitle].filter((value): value is string => Boolean(value)));
  const rows: TransactionDetailRow[] = [];

  if (isStrategyMovement) {
    pushUniqueRow(rows, 'Plan', strategyValue(transaction), used);
  } else {
    rows.push({ label: 'Type', value: typeLabel });
    used.add(typeLabel);
    pushUniqueRow(rows, 'Recipient', transaction.recipient, used);
    pushUniqueRow(rows, 'Source', transaction.source, used);
  }

  rows.push({ label: isStrategyMovement ? 'Date' : 'Date / time', value: transactionTimestamp(transaction) });

  if (transaction.fee) {
    rows.push({ label: 'Fee', value: formatMoney(transaction.fee.amount, transaction.fee.currency) });
  }
  if (transaction.arrival) {
    rows.push({ label: 'Arrival', value: transaction.arrival });
  }

  const advanced: TransactionDetailRow[] = [];
  const route = transaction.routeDetails;
  if (route?.network) advanced.push({ label: 'Network', value: route.network });
  if (route?.provider) advanced.push({ label: 'Provider', value: route.provider });
  if (route?.route) advanced.push({ label: 'Route', value: route.route });
  if (route?.transactionHash) {
    advanced.push({ label: 'Transaction hash', value: compactTransactionHash(route.transactionHash) });
  }

  return {
    title: transaction.title,
    subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    status: transaction.status,
    statusLabel: transactionStatusLabel(transaction.status),
    statusSymbol: transactionStatusSymbol(transaction.status),
    symbol: transaction.symbol,
    rows,
    advanced,
  };
}

export function toActivityListItem(transaction: Transaction): ActivityListItem {
  return {
    id: transaction.id,
    title: transaction.title,
    subtitle: transaction.subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    // Section headers already show the calendar day; show time only to stay on one line.
    timestamp: transactionTime(transaction),
    category: transactionCategory(transaction),
    group: transactionSection(transaction).id,
    symbol: transaction.symbol,
    iconStyle: transaction.iconStyle,
    status: transaction.status,
  };
}

export function toEarnListItem(transaction: Transaction): EarnListItem {
  const isYield = transaction.type === 'yield-earned';
  return {
    id: transaction.id,
    title: transaction.title,
    subtitle: transaction.subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    // Section headers already show the calendar day; show time only to stay on one line.
    meta: transactionTime(transaction),
    footerLeadingText: transactionStatusLabel(transaction.status),
    footerTrailingText: 'Details',
    symbol: transaction.symbol ?? 'chart.line.uptrend.xyaxis',
    iconStyle: isYield ? 'earning' : 'strategy',
    segment: isYield ? 'earnings' : 'strategies',
    action: 'details',
    status: transaction.status,
  };
}

export function walletTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => walletTypes.has(transaction.type));
}

export function earnTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => earningTypes.has(transaction.type));
}
