import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SoroswapAdapter } from '../../adapters/soroswap.adapter.js';
import { ApiError } from '../../domain/api-errors.js';
import { sendApiError } from './http-errors.js';

export function registerSwapRoutes(app: FastifyInstance, soroswap: SoroswapAdapter): void {
  app.get('/api/v1/swaps/assets', async (_req, reply) => {
    try {
      if (!soroswap.isConfigured) {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'SOROSWAP_API_KEY missing', 503);
      }
      const assets = await soroswap.discoverAssets();
      return { network: 'testnet', assets };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/swaps/quote', async (req, reply) => {
    try {
      const body = z
        .object({
          assetIn: z.string().min(10),
          assetOut: z.string().min(10),
          amount: z.string().min(1),
          tradeType: z.enum(['exact_in', 'exact_out']).default('exact_in'),
          slippageBps: z.number().int().optional(),
        })
        .parse(req.body);
      const amount = BigInt(body.amount);
      const quote =
        body.tradeType === 'exact_out'
          ? await soroswap.quoteExactOut({
              assetIn: body.assetIn,
              assetOut: body.assetOut,
              amountOut: amount,
              slippageBps: body.slippageBps,
            })
          : await soroswap.quoteExactIn({
              assetIn: body.assetIn,
              assetOut: body.assetOut,
              amountIn: amount,
              slippageBps: body.slippageBps,
            });
      return { quote };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/swaps/build', async (req, reply) => {
    try {
      const body = z
        .object({
          quote: z.record(z.unknown()),
          from: z.string().min(56).max(56),
          to: z.string().min(56).max(56).optional(),
        })
        .parse(req.body);
      const built = await soroswap.buildFromQuote(body.quote as never, body.from, body.to);
      return { unsignedXdr: built.xdr, action: built.action, description: built.description };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
