import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../domain/api-errors.js';
import type { AnchorSessionStore } from '../../services/anchor-session-store.service.js';
import { sendApiError } from './http-errors.js';

const sessionIdSchema = z.string().uuid();

function jwtFromSession(
  sessions: AnchorSessionStore,
  sessionId: string,
  account?: string,
): string {
  try {
    return sessions.resolve(sessionId, account);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ANCHOR_SESSION_INVALID';
    if (msg === 'ANCHOR_SESSION_NOT_FOUND' || msg === 'ANCHOR_SESSION_EXPIRED') {
      throw new ApiError('ANCHOR_SESSION_INVALID', 'Anchor session expired or unknown', 401);
    }
    if (msg === 'ANCHOR_SESSION_ACCOUNT_MISMATCH') {
      throw new ApiError('VALIDATION_ERROR', 'Anchor session account mismatch', 400);
    }
    throw err;
  }
}

export function registerAnchorRoutes(
  app: FastifyInstance,
  anchor: TrMockAnchorAdapter,
  sessions: AnchorSessionStore,
): void {
  app.get('/api/v1/anchor/session', async () => ({
    domain: env.TR_ANCHOR_DOMAIN,
    protocol: 'sep6',
    tomlUrl: anchor.tomlUrl(),
    webAuthFlow: 'sep10',
    auth: {
      challenge: 'GET /api/v1/anchor/auth/challenge?account=G...',
      complete: 'POST /api/v1/anchor/auth/complete',
      note: 'Mobile signs challenge locally; BFF stores JWT and returns opaque sessionId only',
    },
  }));

  app.get('/api/v1/anchor/auth/challenge', async (req, reply) => {
    try {
      const account = z
        .string()
        .regex(/^G[A-Z0-9]{55}$/)
        .parse((req.query as { account?: string }).account);
      const challenge = await anchor.sep10Challenge(account);
      return challenge;
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/anchor/auth/complete', async (req, reply) => {
    try {
      const body = z
        .object({
          transaction: z.string().min(10),
        })
        .parse(req.body);
      const { token, account } = await anchor.sep10TokenFromSignedTransaction(body.transaction);
      const session = sessions.create(token, account);
      return session;
    } catch (err) {
      return sendApiError(reply, err);
    }
  });

  app.post('/api/v1/anchor/quotes', async (req, reply) => {
    try {
      const body = z
        .object({
          sessionId: sessionIdSchema,
          sellAsset: z.string().min(1),
          buyAsset: z.string().optional(),
          sellAmount: z.string().min(1),
        })
        .parse(req.body);
      const jwt = jwtFromSession(sessions, body.sessionId);
      const quote = await anchor.sep38Quote(jwt, {
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
          sessionId: sessionIdSchema,
          account: z.string().min(56).max(56),
          amount: z.string().optional(),
        })
        .parse(req.body);
      const jwt = jwtFromSession(sessions, body.sessionId, body.account);
      const session = await anchor.sep6DepositInteractive(jwt, {
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
          sessionId: sessionIdSchema,
          account: z.string().min(56).max(56),
          amount: z.string().min(1),
          dest: z.string().min(1),
          destExtra: z.string().optional(),
        })
        .parse(req.body);
      const jwt = jwtFromSession(sessions, body.sessionId, body.account);
      const session = await anchor.sep6WithdrawInteractive(jwt, {
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
