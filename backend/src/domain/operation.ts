export type OperationStatus =
  | 'created'
  | 'awaiting_signature'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'blocked';

export type OperationKind =
  | 'payment'
  | 'swap'
  | 'anchor_deposit'
  | 'anchor_withdraw'
  | 'yield_deposit'
  | 'yield_withdraw'
  | 'policy'
  | 'transfer';

export type Operation = {
  id: string;
  kind: OperationKind;
  status: OperationStatus;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  subtitle?: string;
  amount?: { assetCode: string; amount: string };
  externalRefs?: {
    txHash?: string;
    anchorTransferId?: string;
    quoteId?: string;
  };
  metadata?: Record<string, unknown>;
};

export function normalizeActivityItem(op: Operation) {
  return {
    id: op.id,
    operationId: op.id,
    kind: op.kind,
    status: op.status,
    accountId: op.accountId,
    occurredAt: op.updatedAt,
    createdAt: op.createdAt,
    title: op.title,
    subtitle: op.subtitle ?? null,
    amount: op.amount ?? null,
    txHash: op.externalRefs?.txHash ?? null,
    anchorTransferId: op.externalRefs?.anchorTransferId ?? null,
    quoteId: op.externalRefs?.quoteId ?? null,
    metadata: op.metadata ?? null,
  };
}
