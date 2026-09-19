import type { FastifyInstance } from 'fastify';
import type { StellarService } from '../../services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../adapters/tr-mock-anchor.adapter.js';
import type { DefindexYieldAdapter } from '../../adapters/defindex-yield.adapter.js';
import type { SoroswapAdapter } from '../../adapters/soroswap.adapter.js';
import type { PolicyService } from '../../services/policy.service.js';
import { env, isDemoSignerAvailable } from '../../config/env.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  stellar: StellarService,
  anchor: TrMockAnchorAdapter,
  defindex: DefindexYieldAdapter,
  soroswap: SoroswapAdapter,
  policy: PolicyService,
): void {
  app.get('/api/v1/health', async () => {
    const [network, anchorHealth, defindexHealth, soroswapHealth] = await Promise.all([
      stellar.probeNetwork().catch(() => ({ horizon: false as const })),
      anchor.health().catch(() => ({ ok: false, body: null })),
      defindex.healthCheck(),
      soroswap.healthCheck(),
    ]);

    const defindexState = !defindexHealth.configured
      ? 'unconfigured'
      : defindexHealth.error === 'DEFINDEX_VAULT_ASSET_MISMATCH'
        ? 'blocked'
        : defindexHealth.ok
          ? 'healthy'
          : 'fragmented';

    const soroswapState = !soroswapHealth.configured
      ? 'unconfigured'
      : soroswapHealth.ok
        ? 'healthy'
        : 'fragmented';

    const adaptersOk =
      network.horizon && anchorHealth.ok && (defindexState === 'healthy' || defindexState === 'unconfigured');

    return {
      status: adaptersOk ? 'ok' : 'degraded',
      network: env.STELLAR_NETWORK,
      horizon: network.horizon,
      rpcLedger: 'rpcLedger' in network ? (network.rpcLedger ?? null) : null,
      anchor: {
        domain: env.TR_ANCHOR_DOMAIN,
        healthy: anchorHealth.ok,
      },
      defindex: { ...defindexHealth, state: defindexState },
      soroswap: { ...soroswapHealth, state: soroswapState },
      policy: {
        contractId: policy.adapter.contractId,
        wasmHash: policy.adapter.wasmHash,
      },
      demoSigner: isDemoSignerAvailable(),
      timestamp: new Date().toISOString(),
    };
  });
}
