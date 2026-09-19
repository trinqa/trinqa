import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { policyBuildActionSchema } from '../../domain/policy.js';
import type { PolicyService } from '../../services/policy.service.js';

const accountParamsSchema = z.object({
  accountId: z.string().regex(/^G[A-Z0-9]{55}$/, 'Expected Stellar account public key'),
});

export function registerPolicyRoutes(app: FastifyInstance, policy: PolicyService): void {
  app.get('/api/v1/policy/:accountId', async (request, reply) => {
    const parsed = accountParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_account', details: parsed.error.flatten() });
    }
    const view = await policy.getPolicy(parsed.data.accountId);
    return view;
  });

  app.post('/api/v1/policy/build', async (request, reply) => {
    const parsed = policyBuildActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }
    try {
      const built = await policy.buildTransaction(parsed.data);
      return built;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: 'policy_build_failed', message });
    }
  });

  app.post('/api/v1/policy/submit', async (request, reply) => {
    const bodySchema = z.object({ signedXdr: z.string().min(10) });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }
    try {
      const result = await policy.submitSignedPolicyTx(parsed.data.signedXdr);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: 'policy_submit_failed', message });
    }
  });
}
