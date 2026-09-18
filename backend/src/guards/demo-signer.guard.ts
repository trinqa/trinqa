import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, isDemoSignerAvailable } from '../config/env.js';

export function assertTestnetOnly(): void {
  if (env.STELLAR_NETWORK !== 'testnet') {
    throw new Error('Demo signer routes are disabled outside testnet');
  }
}

export async function demoSignerGuard(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  assertTestnetOnly();
  if (!isDemoSignerAvailable()) {
    return reply.status(403).send({
      error: 'demo_signer_disabled',
      message:
        'Set DEMO_SIGNER_ENABLED=true and DEMO_SIGNER_SECRET (testnet key) in backend/.env',
    });
  }
}
