import type { FastifyInstance } from 'fastify';
import { Keypair, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { demoSignerGuard } from '../../guards/demo-signer.guard.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../domain/api-errors.js';
import type { StellarService } from '../../services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import type { AnchorSessionStore } from '../../services/anchor-session-store.service.js';
import { sendApiError } from './http-errors.js';

const trustlineBody = z.object({
  account: z.string().regex(/^G[A-Z0-9]{55}$/),
});

const signBody = z.object({
  unsignedXdr: z.string().min(10),
});

const simulateBankBody = z.object({
  sessionId: z.string().uuid(),
  transferId: z.string().min(1),
});

function jwtFromSession(sessions: AnchorSessionStore, sessionId: string, account?: string): string {
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

export function registerDemoRoutes(
  app: FastifyInstance,
  stellar: StellarService,
  anchor: TrMockAnchorAdapter,
  sessions: AnchorSessionStore,
): void {
  app.get('/api/v1/demo/account', { preHandler: demoSignerGuard }, async () => {
    const kp = Keypair.fromSecret(env.DEMO_SIGNER_SECRET!);
    return { account: kp.publicKey(), network: env.STELLAR_NETWORK };
  });

  app.post(
    '/api/v1/demo/sign',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
      try {
        const body = signBody.parse(request.body);
        const secret = env.DEMO_SIGNER_SECRET!;
        const kp = Keypair.fromSecret(secret);
        const tx = TransactionBuilder.fromXDR(body.unsignedXdr, stellar.networkPassphrase);
        if (!(tx instanceof Transaction)) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: 'unsignedXdr must be a transaction envelope',
          });
        }
        if (tx.source !== kp.publicKey()) {
          return reply.status(400).send({
            error: 'account_mismatch',
            message: 'Transaction source must match demo signer public key',
            expected: kp.publicKey(),
          });
        }
        return { signedXdr: stellar.signXdr(body.unsignedXdr, secret) };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid unsignedXdr' });
        }
        if (err instanceof ApiError) return sendApiError(reply, err);
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message });
      }
    },
  );

  app.post(
    '/api/v1/demo/anchor/simulate-bank-transfer',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
      try {
        const body = simulateBankBody.parse(request.body);
        const jwt = jwtFromSession(sessions, body.sessionId);
        const result = await anchor.sep6SimulateBankTransfer(jwt, body.transferId);
        return { result };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid simulate-bank payload' });
        }
        if (err instanceof ApiError) return sendApiError(reply, err);
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: 'ADAPTER_UNAVAILABLE', message });
      }
    },
  );

  app.post(
    '/api/v1/demo/trustline/usdc',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
      try {
        const body = trustlineBody.parse(request.body);
        const secret = env.DEMO_SIGNER_SECRET!;
        const signer = Keypair.fromSecret(secret);
        if (signer.publicKey() !== body.account) {
          return reply.status(400).send({
            error: 'account_mismatch',
            message: 'Demo signer public key must match account',
            expected: signer.publicKey(),
          });
        }
        const unsigned = await stellar.buildUsdcTrustlineXdr(body.account);
        const signed = stellar.signXdr(unsigned, secret);
        const result = await stellar.submitSignedXdr(signed);
        return { hash: result.hash, successful: result.successful };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid trustline payload' });
        }
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: 'ADAPTER_UNAVAILABLE', message });
      }
    },
  );

  app.post(
    '/api/v1/demo/sep10',
    { preHandler: demoSignerGuard },
    async () => {
      const secret = env.DEMO_SIGNER_SECRET!;
      const kp = Keypair.fromSecret(secret);
      const account = kp.publicKey();
      const { transaction } = await anchor.sep10Challenge(account);
      const envelope = TransactionBuilder.fromXDR(transaction, stellar.networkPassphrase);
      envelope.sign(kp);
      const { token, account: resolvedAccount } = await anchor.sep10TokenFromSignedTransaction(
        envelope.toXDR(),
      );
      const session = sessions.create(token, resolvedAccount);
      return { sessionId: session.sessionId, expiresAt: session.expiresAt };
    },
  );
}
