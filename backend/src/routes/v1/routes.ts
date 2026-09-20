import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RoutePlanner } from '../../services/route-planner.service.js';
import type { RouteRequest } from '../../domain/route.js';
import { sendApiError } from './http-errors.js';

const querySchema = z.object({
  direction: z.enum(['withdraw', 'deposit']),
  currency: z.string().min(3).max(4),
  amount: z.string().min(1),
  riskProfile: z.coerce.number().int().min(0).max(2).optional(),
  daysToTarget: z.coerce.number().int().min(0).optional(),
  // z.coerce.boolean() would turn the string "false" into `true`; be explicit instead.
  requireExecutable: z.enum(['true', 'false']).optional(),
  kycStatus: z.enum(['ACCEPTED', 'NEEDS_INFO', 'PROCESSING', 'REJECTED', 'UNKNOWN']).optional(),
});

export function registerRouteRoutes(app: FastifyInstance, planner: RoutePlanner): void {
  app.get('/api/v1/routes/preview', async (req, reply) => {
    try {
      const query = querySchema.parse(req.query);
      const request: RouteRequest = {
        direction: query.direction,
        fiatCurrency: query.currency.toUpperCase(),
        assetCode: 'USDC',
        amount: query.amount,
        kycStatus: query.kycStatus,
        requireExecutable: query.requireExecutable === 'true',
        user:
          query.riskProfile !== undefined && query.daysToTarget !== undefined
            ? { riskProfile: query.riskProfile as 0 | 1 | 2, daysToTarget: query.daysToTarget }
            : undefined,
      };
      const decision = await planner.preview(request);
      return decision;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid route preview query', details: err.issues });
      }
      return sendApiError(reply, err);
    }
  });
}
