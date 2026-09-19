import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, isDemoSignerAvailable } from '../config/env.js';

export const DEMO_TOKEN_HEADER = 'x-demo-token';

/** No configured token = open (local dev); otherwise constant-time exact match. */
export function demoTokenAccepted(expected: string | undefined, provided: string | undefined): boolean {
  if (!expected) return true;
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function assertTestnetOnly(): void {
  if (env.STELLAR_NETWORK !== 'testnet') {
    throw new Error('Demo signer routes are disabled outside testnet');
  }
}

export async function demoSignerGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  assertTestnetOnly();
  const provided = request.headers[DEMO_TOKEN_HEADER];
  if (!demoTokenAccepted(env.DEMO_ACCESS_TOKEN, typeof provided === 'string' ? provided : undefined)) {
    return reply.status(401).send({ error: 'demo_token_required', message: `Missing or invalid ${DEMO_TOKEN_HEADER}` });
  }
  if (!isDemoSignerAvailable()) {
    return reply.status(403).send({
      error: 'demo_signer_disabled',
      message:
        'Set DEMO_SIGNER_ENABLED=true and DEMO_SIGNER_SECRET (testnet key) in backend/.env',
    });
  }
}
