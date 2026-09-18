import type { FastifyInstance } from 'fastify';
import type { StellarService } from '../../services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import { env } from '../../config/env.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  stellar: StellarService,
  anchor: TrMockAnchorAdapter,
): void {
  app.get('/api/v1/health', async () => {
    const [network, anchorHealth] = await Promise.all([
      stellar.probeNetwork().catch(() => ({ horizon: false as const })),
      anchor.health().catch(() => ({ ok: false, body: null })),
    ]);

    return {
      status: network.horizon && anchorHealth.ok ? 'ok' : 'degraded',
      network: env.STELLAR_NETWORK,
      horizon: network.horizon,
      rpcLedger: network.rpcLedger ?? null,
      anchor: {
        domain: env.TR_ANCHOR_DOMAIN,
        healthy: anchorHealth.ok,
      },
      demoSigner: env.DEMO_SIGNER_ENABLED,
      timestamp: new Date().toISOString(),
    };
  });
}
