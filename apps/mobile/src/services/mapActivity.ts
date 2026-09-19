import type { ActivityItem } from '@/services/types';
import type { CurrencyCode, Transaction, TransactionDirection, TransactionStatus, TransactionType } from '@/types';

function mapKind(kind: string): TransactionType {
  switch (kind) {
    case 'anchor_deposit':
      return 'deposit';
    case 'anchor_withdraw':
      return 'withdrawal';
    case 'yield_deposit':
      return 'added-to-earning';
    case 'yield_withdraw':
      return 'returned-to-available';
    case 'policy':
      return 'rebalance';
    case 'swap':
    case 'transfer':
    case 'payment':
    default:
      return 'payment';
  }
}

function mapStatus(status: string): TransactionStatus {
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'blocked') return 'failed';
  return 'pending';
}

function mapDirection(type: TransactionType): TransactionDirection {
  if (type === 'deposit' || type === 'received' || type === 'yield-earned') return 'in';
  if (type === 'payment' || type === 'withdrawal') return 'out';
  return 'neutral';
}

function mapCurrency(code: string | undefined): CurrencyCode {
  if (code === 'TRY' || code === 'EUR' || code === 'BRL') return code;
  return 'USD';
}

export function activityToTransaction(item: ActivityItem): Transaction {
  const type = mapKind(item.kind);
  const amount = Number(item.amount?.amount ?? 0);
  return {
    id: item.id,
    type,
    title: item.title,
    subtitle: item.subtitle ?? item.kind,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: mapCurrency(item.amount?.assetCode),
    direction: mapDirection(type),
    status: mapStatus(item.status),
    occurredAt: item.occurredAt,
    routeDetails: item.txHash
      ? { network: 'Stellar testnet', transactionHash: item.txHash, provider: 'Trinqa BFF' }
      : { network: 'Stellar testnet', provider: 'Trinqa BFF' },
  };
}
