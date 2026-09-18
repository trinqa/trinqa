import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { StellarService } from '../../services/stellar.service.js';
import { env } from '../../config/env.js';
import { sendApiError } from './http-errors.js';

export function registerAccountRoutes(app: FastifyInstance, stellar: StellarService): void {
  app.get('/api/v1/accounts/:accountId/balances', async (req, reply) => {
    try {
      const { accountId } = z.object({ accountId: z.string().min(56).max(56) }).parse(req.params);
      const lines = await stellar.getBalances(accountId);
      return {
        accountId,
        balances: lines.map((b) => ({
          assetType: b.assetType,
          assetCode: b.assetCode ?? 'XLM',
          assetIssuer: b.assetIssuer ?? null,
          amount: b.balance,
        })),
      };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.get('/api/v1/accounts/:accountId/receive', async (req) => {
    const { accountId } = z.object({ accountId: z.string().min(56).max(56) }).parse(req.params);
    return {
      accountId,
      network: env.STELLAR_NETWORK,
      passphrase: stellar.networkPassphrase,
      recommendedAssets: [{ code: 'USDC', issuer: env.USDC_ISSUER }],
      memo: null,
      qrPayload: `stellar:${accountId}?network=testnet`,
    };
  });
}
