import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import { env } from '../../config/env.js';
import { sendApiError } from './http-errors.js';

export function registerAnchorRoutes(app: FastifyInstance, anchor: TrMockAnchorAdapter): void {
  app.get('/api/v1/anchor/session', async () => ({
    domain: env.TR_ANCHOR_DOMAIN,
    protocol: 'sep6',
    tomlUrl: anchor.tomlUrl(),
    webAuthFlow: 'sep10',
  }));

  app.post('/api/v1/anchor/quotes', async (req, reply) => {
    try {
      const body = z
        .object({
          jwt: z.string().min(10),
          sellAsset: z.string().min(1),
          buyAsset: z.string().optional(),
          sellAmount: z.string().min(1),
        })
        .parse(req.body);
      const quote = await anchor.sep38Quote(body.jwt, {
        sellAsset: body.sellAsset,
        buyAsset: body.buyAsset ?? `stellar:USDC:${env.USDC_ISSUER}`,
        sellAmount: body.sellAmount,
      });
      return { quote };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/anchor/deposits', async (req, reply) => {
    try {
      const body = z
        .object({
          jwt: z.string().min(10),
          account: z.string().min(56).max(56),
          amount: z.string().optional(),
        })
        .parse(req.body);
      const session = await anchor.sep6DepositInteractive(body.jwt, {
        asset_code: 'USDC',
        account: body.account,
        amount: body.amount,
      });
      return { session };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/anchor/withdrawals', async (req, reply) => {
    try {
      const body = z
        .object({
          jwt: z.string().min(10),
          account: z.string().min(56).max(56),
          amount: z.string().min(1),
          dest: z.string().min(1),
          destExtra: z.string().optional(),
        })
        .parse(req.body);
      const session = await anchor.sep6WithdrawInteractive(body.jwt, {
        asset_code: 'USDC',
        account: body.account,
        amount: body.amount,
        dest: body.dest,
        dest_extra: body.destExtra,
      });
      return { session };
    } catch (err) {
      return sendApiError(reply, err);
    }
  });
}
