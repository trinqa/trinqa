import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PaymentRouter } from '../../services/payment-router.service.js';
import type { StellarService } from '../../services/stellar.service.js';
import type { OperationStore } from '../../services/operation-store.js';
import { sendApiError } from './http-errors.js';

export function registerPaymentRoutes(
  app: FastifyInstance,
  router: PaymentRouter,
  stellar: StellarService,
  operations: OperationStore,
): void {
  app.post('/api/v1/payments/quote', async (req, reply) => {
    try {
      const body = z
        .object({
          fromAccount: z.string().min(56).max(56),
          recipient: z.string().min(56).max(56),
          sourceAmount: z.string().min(1),
          sourceAssetCode: z.enum(['USDC', 'XLM']).default('USDC'),
          destinationCurrency: z.string().min(3).max(4),
          balanceSource: z.enum(['available', 'earn']).optional(),
        })
        .parse(req.body);
      const quote = await router.quote(body);
      return { quote };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/payments/build', async (req, reply) => {
    try {
      const body = z
        .object({
          quoteId: z.string().uuid(),
          fromAccount: z.string().min(56).max(56),
        })
        .parse(req.body);
      return await router.build(body.quoteId, body.fromAccount);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/payments/submit', async (req, reply) => {
    try {
      const body = z
        .object({
          operationId: z.string().uuid().optional(),
          signedXdr: z.string().min(10),
        })
        .parse(req.body);
      const result = await stellar.submitSignedXdr(body.signedXdr);
      if (body.operationId) {
        await operations.update(body.operationId, {
          status: result.successful ? 'completed' : 'failed',
          externalRefs: { txHash: result.hash },
        });
      }
      return result;
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
