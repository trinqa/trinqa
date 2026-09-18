import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { normalizeActivityItem } from '../../domain/operation.js';
import type { OperationStore } from '../../services/operation-store.js';

/** Activity feed stub — normalized from OperationStore until ledger indexing lands. */
export function registerActivityRoutes(app: FastifyInstance, store: OperationStore): void {
  app.get('/api/v1/activity/:accountId', async (req) => {
    const { accountId } = z.object({ accountId: z.string().min(56).max(56) }).parse(req.params);
    const limit = z.coerce.number().int().min(1).max(100).default(25).parse(
      (req.query as { limit?: string }).limit,
    );
    const ops = await store.listByAccount(accountId, limit);
    return {
      accountId,
      items: ops.map(normalizeActivityItem),
      source: 'operation_store',
    };
  });
}
