import { describe, expect, it } from 'vitest';
import { MemoryOperationStore } from '../../src/services/operation-store.js';

describe('OperationStore externalRefs merge', () => {
  it('preserves quoteId when anchorTransferId is added', async () => {
    const store = new MemoryOperationStore();
    const op = await store.create({
      kind: 'anchor_deposit',
      status: 'processing',
      accountId: 'G'.repeat(56),
      title: 'deposit',
      externalRefs: { quoteId: 'q-123' },
    });
    const updated = await store.update(op.id, {
      externalRefs: { anchorTransferId: 'tx-9' },
    });
    expect(updated.externalRefs?.quoteId).toBe('q-123');
    expect(updated.externalRefs?.anchorTransferId).toBe('tx-9');
  });
});
