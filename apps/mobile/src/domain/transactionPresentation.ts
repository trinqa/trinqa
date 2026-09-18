import { formatSignedMoney } from '@/domain/money';
import type {
  ActivityListItem,
  ActivitySegment,
  EarnListItem,
  Transaction,
  TransactionStatus,
  WalletTransactionItem,
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
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  return 'Completed';
}

export function toActivityListItem(transaction: Transaction): ActivityListItem {
  return {
    id: transaction.id,
    title: transaction.title,
    subtitle: transaction.subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    timestamp: transactionTimestamp(transaction),
    category: transactionCategory(transaction),
    group: transactionSection(transaction).id,
    symbol: transaction.symbol,
    iconStyle: transaction.iconStyle,
    status: transaction.status,
  };
}

export function toWalletTransactionItem(transaction: Transaction): WalletTransactionItem {
  return {
    id: transaction.id,
    title: transaction.title,
    detail: transaction.subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    time: transactionTime(transaction),
    symbol: transaction.symbol ?? 'arrow.left.arrow.right',
    iconStyle: transaction.type === 'added-to-earning' ? 'accent' : 'neutral',
    group: transactionSection(transaction).id,
  };
}

export function toEarnListItem(transaction: Transaction): EarnListItem {
  const isYield = transaction.type === 'yield-earned';
  return {
    id: transaction.id,
    title: transaction.title,
    subtitle: transaction.subtitle,
    amount: formatSignedMoney(transaction.amount, transaction.currency, transaction.direction),
    meta: transactionTimestamp(transaction),
    footerLeadingText: transactionStatusLabel(transaction.status),
    footerTrailingText: 'Details',
    symbol: transaction.symbol ?? 'chart.line.uptrend.xyaxis',
    iconStyle: isYield ? 'earning' : 'strategy',
    segment: isYield ? 'earnings' : 'strategies',
    action: 'details',
  };
}

export function walletTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => walletTypes.has(transaction.type));
}

export function earnTransactions(transactions: Transaction[]) {
  return transactions.filter((transaction) => earningTypes.has(transaction.type));
}
