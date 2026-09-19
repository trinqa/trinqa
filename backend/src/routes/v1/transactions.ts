import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { StellarService } from '../../services/stellar.service.js';
import { sendApiError } from './http-errors.js';

export function registerTransactionRoutes(app: FastifyInstance, stellar: StellarService): void {
  app.post('/api/v1/transactions/submit', async (req, reply) => {
    try {
      const body = z.object({ signedXdr: z.string().min(10) }).parse(req.body);
      return await stellar.submitSignedXdr(body.signedXdr);
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
