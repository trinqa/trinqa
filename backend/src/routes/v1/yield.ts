import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { YieldService } from '../../services/yield.service.js';
import { sendApiError } from './http-errors.js';

export function registerYieldRoutes(app: FastifyInstance, yieldSvc: YieldService): void {
  app.get('/api/v1/yield/strategies', async (req, reply) => {
    try {
      const q = z.object({ accountId: z.string().optional() }).parse(req.query);
      const strategies = await yieldSvc.listStrategies(q.accountId);
      return { strategies };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.get('/api/v1/yield/positions/:accountId', async (req, reply) => {
    try {
      const params = z.object({ accountId: z.string().min(56).max(56) }).parse(req.params);
      const positions = await yieldSvc.getPositions(params.accountId);
      return { accountId: params.accountId, positions };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/yield/deposits/build', async (req, reply) => {
    try {
      const body = z
        .object({
          accountId: z.string().min(56).max(56),
          strategyId: z.string().min(1),
          amount: z.string().min(1),
          invest: z.boolean().optional(),
        })
        .parse(req.body);
      return await yieldSvc.buildDeposit(body);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/yield/withdrawals/build', async (req, reply) => {
    try {
      const body = z
        .object({
          accountId: z.string().min(56).max(56),
          strategyId: z.string().min(1),
          amount: z.string().optional(),
          shares: z.string().optional(),
        })
        .parse(req.body);
      return await yieldSvc.buildWithdraw(body);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
