import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { demoSignerGuard } from '../../guards/demo-signer.guard.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../domain/api-errors.js';
import type { StellarService } from '../../services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import type { AnchorSessionStore } from '../../services/anchor-session-store.service.js';
import {
  CustodialWallets,
  envDemoSigner,
  isContactId,
  isWalletKey,
  type AccountSigner,
} from '../../services/custodial-wallet.service.js';
import { sendApiError } from './http-errors.js';
import { WALLET_KEY_HEADER, signerForRequest } from './wallet-signer.js';

export { WALLET_KEY_HEADER };

const trustlineBody = z.object({
  account: z.string().regex(/^G[A-Z0-9]{55}$/),
});

const signBody = z.object({
  unsignedXdr: z.string().min(10),
});

const walletBody = z.object({
  walletKey: z.string().optional(),
});

const contactsBody = z.object({
  ids: z.array(z.string()).min(1).max(12),
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
  wallets: CustodialWallets | null = CustodialWallets.fromConfig(env, stellar),
): void {
  /** The signer this request acts as: its device wallet, or the env demo account for legacy clients. */
  function signerFor(request: FastifyRequest): AccountSigner {
    return signerForRequest(request, wallets, () =>
      envDemoSigner(env.DEMO_SIGNER_SECRET!, stellar.networkPassphrase),
    );
  }

  app.post('/api/v1/demo/wallets', { preHandler: demoSignerGuard }, async (request, reply) => {
    try {
      if (!wallets) throw new ApiError('ADAPTER_UNAVAILABLE', 'Custodial wallets are not configured', 503);
      const body = walletBody.parse(request.body ?? {});
      if (body.walletKey !== undefined && !isWalletKey(body.walletKey)) {
        throw new ApiError('VALIDATION_ERROR', 'Invalid walletKey', 400);
      }
      const walletKey = body.walletKey ?? wallets.newWalletKey();
      const result = await wallets.provision(walletKey);
      return { walletKey, ...result, network: env.STELLAR_NETWORK };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid wallet payload' });
      }
      if (err instanceof ApiError) return sendApiError(reply, err);
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: 'ADAPTER_UNAVAILABLE', message });
    }
  });

  /**
   * Accounts for the seeded demo contacts, so "send to Ana" reaches a real
   * testnet account instead of the sender's own. Idempotent; funds on first call.
   */
  app.post('/api/v1/demo/contacts', { preHandler: demoSignerGuard }, async (request, reply) => {
    try {
      if (!wallets) throw new ApiError('ADAPTER_UNAVAILABLE', 'Custodial wallets are not configured', 503);
      const body = contactsBody.parse(request.body ?? {});
      const invalid = body.ids.find((id) => !isContactId(id));
      if (invalid !== undefined) {
        throw new ApiError('VALIDATION_ERROR', `Invalid contact id: ${invalid}`, 400);
      }
      const contacts = await Promise.all(
        body.ids.map(async (id) => ({ id, ...(await wallets.provisionContact(id)) })),
      );
      return { contacts, network: env.STELLAR_NETWORK };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid contacts payload' });
      }
      if (err instanceof ApiError) return sendApiError(reply, err);
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: 'ADAPTER_UNAVAILABLE', message });
    }
  });

  app.get('/api/v1/demo/account', { preHandler: demoSignerGuard }, async (request, reply) => {
    try {
      return { account: signerFor(request).publicKey, network: env.STELLAR_NETWORK };
    } catch (err) {
      if (err instanceof ApiError) return sendApiError(reply, err);
      throw err;
    }
  });

  app.post(
    '/api/v1/demo/sign',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
      try {
        const body = signBody.parse(request.body);
        const signer = signerFor(request);
        const tx = TransactionBuilder.fromXDR(body.unsignedXdr, stellar.networkPassphrase);
        if (!(tx instanceof Transaction)) {
          return reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: 'unsignedXdr must be a transaction envelope',
          });
        }
        if (tx.source !== signer.publicKey) {
          return reply.status(400).send({
            error: 'account_mismatch',
            message: 'Transaction source must match the signing account',
            expected: signer.publicKey,
          });
        }
        return { signedXdr: signer.signXdr(body.unsignedXdr) };
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
        const signer = signerFor(request);
        if (signer.publicKey !== body.account) {
          return reply.status(400).send({
            error: 'account_mismatch',
            message: 'Signing account must match account',
            expected: signer.publicKey,
          });
        }
        const unsigned = await stellar.buildUsdcTrustlineXdr(body.account);
        const signed = signer.signXdr(unsigned);
        const result = await stellar.submitSignedXdr(signed);
        return { hash: result.hash, successful: result.successful };
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid trustline payload' });
        }
        if (err instanceof ApiError) return sendApiError(reply, err);
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: 'ADAPTER_UNAVAILABLE', message });
      }
    },
  );

  app.post(
    '/api/v1/demo/sep10',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
      let signer: AccountSigner;
      try {
        signer = signerFor(request);
      } catch (err) {
        if (err instanceof ApiError) return sendApiError(reply, err);
        throw err;
      }
      const { transaction } = await anchor.sep10Challenge(signer.publicKey);
      const envelope = TransactionBuilder.fromXDR(transaction, stellar.networkPassphrase);
      if (!(envelope instanceof Transaction)) {
        throw new Error('SEP-10 challenge must be a transaction envelope');
      }
      signer.signTransaction(envelope);
      const { token, account: resolvedAccount } = await anchor.sep10TokenFromSignedTransaction(
        envelope.toXDR(),
      );
      const session = sessions.create(token, resolvedAccount);
      return { sessionId: session.sessionId, expiresAt: session.expiresAt };
    },
  );
}
