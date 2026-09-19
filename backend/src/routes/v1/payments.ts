import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PaymentRouter } from '../../services/payment-router.service.js';
import type { PaymentExecutionService } from '../../services/payment-execution.service.js';
import { sendApiError } from './http-errors.js';

export function registerPaymentRoutes(
  app: FastifyInstance,
  router: PaymentRouter,
  execution: PaymentExecutionService,
): void {
  app.post('/api/v1/payments/quote', async (req, reply) => {
    try {
      const body = z
        .object({
          fromAccount: z.string().min(56).max(56),
          recipient: z.string().min(56).max(56),
          receiveAmount: z.string().min(1),
          receiveCurrency: z.string().min(3).max(4),
          balanceSource: z.enum(['available', 'earn']).optional(),
          anchorSessionId: z.string().uuid().optional(),
          withdrawDest: z.string().min(1).optional(),
          withdrawDestExtra: z.string().optional(),
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
          approveEarnUnwind: z.boolean().optional(),
        })
        .parse(req.body);
      return await router.build(body.quoteId, body.fromAccount, body.approveEarnUnwind);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/payments/execute-step', async (req, reply) => {
    try {
      const body = z
        .object({
          operationId: z.string().uuid(),
          step: z.enum(['yield_withdraw', 'stellar_payment', 'soroswap_swap', 'anchor_withdraw']),
          signedXdr: z.string().min(10),
        })
        .parse(req.body);
      return await execution.executeStep(body.operationId, body.step, body.signedXdr);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/payments/withdraw/quote', async (req, reply) => {
    try {
      const body = z
        .object({
          fromAccount: z.string().min(56).max(56),
          usdcAmount: z.string().min(1),
          anchorSessionId: z.string().uuid(),
          withdrawDest: z.string().min(1),
          withdrawDestExtra: z.string().optional(),
        })
        .parse(req.body);
      const quote = await router.quoteWithdrawToTry(
        body.fromAccount,
        body.usdcAmount,
        body.anchorSessionId,
        body.withdrawDest,
        body.withdrawDestExtra,
      );
      return { quote };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
