import type { FastifyInstance } from 'fastify';
import { Keypair } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { demoSignerGuard } from '../../guards/demo-signer.guard.js';
import { env } from '../../config/env.js';
import type { StellarService } from '../../services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';

const trustlineBody = z.object({
  account: z.string().regex(/^G[A-Z0-9]{55}$/),
});

export function registerDemoRoutes(
  app: FastifyInstance,
  stellar: StellarService,
  anchor: TrMockAnchorAdapter,
): void {
  app.post(
    '/api/v1/demo/trustline/usdc',
    { preHandler: demoSignerGuard },
    async (request, reply) => {
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
    },
  );

  app.post(
    '/api/v1/demo/sep10',
    { preHandler: demoSignerGuard },
    async () => {
      const token = await anchor.sep10Authenticate(env.DEMO_SIGNER_SECRET!);
      return { token: token.token, expiresIn: 'see JWT' };
    },
  );
}
