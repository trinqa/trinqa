import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { OperationStore } from '../../services/operation-store.js';
import { sendApiError } from './http-errors.js';
import { ApiError } from '../../domain/api-errors.js';

export function registerOperationRoutes(app: FastifyInstance, store: OperationStore): void {
  app.get('/api/v1/operations/:id', async (req, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      const op = await store.get(id);
      if (!op) {
        throw new ApiError('NOT_FOUND', 'Operation not found', 404);
      }
      return { operation: op };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
