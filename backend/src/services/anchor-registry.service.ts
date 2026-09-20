import type { AppConfig } from '../config/env.js';
import { SepDiscoveryAnchorAdapter, type SepDiscoveryAnchorAdapterOptions } from '../adapters/sep-discovery-anchor.adapter.js';
import type { AnchorAdapter, AnchorDirectory, AnchorSnapshot } from '../domain/anchor.js';

/** Public reference anchors that publish SEP-1/SEP-6 (or SEP-24 only) discovery info on testnet. */
const DEFAULT_DISCOVERY_DOMAINS = ['testanchor.stellar.org', 'extstellar.moneygram.com'];

export type AnchorRegistryOptions = SepDiscoveryAnchorAdapterOptions;

/**
 * `AnchorDirectory` implementation: the executable TR mock anchor, plus one read-only
 * `SepDiscoveryAnchorAdapter` per configured discovery domain. `list()` never throws — a
 * rejected snapshot becomes an UNAVAILABLE entry instead of failing the whole call.
 */
export class AnchorRegistry implements AnchorDirectory {
  private readonly adapters: Map<string, AnchorAdapter>;

  constructor(trMock: AnchorAdapter, discoveryDomains: string[], opts: AnchorRegistryOptions = {}) {
    this.adapters = new Map();
    this.adapters.set(trMock.id, trMock);
    for (const domain of discoveryDomains) {
      if (this.adapters.has(domain)) continue;
      this.adapters.set(domain, new SepDiscoveryAnchorAdapter(domain, opts));
    }
  }

  adapter(id: string): AnchorAdapter | undefined {
    return this.adapters.get(id);
  }

  async list(): Promise<AnchorSnapshot[]> {
    const entries = [...this.adapters.values()];
    const results = await Promise.allSettled(entries.map((a) => a.snapshot()));
    return results.map((result, index) => {
      const adapter = entries[index]!;
      if (result.status === 'fulfilled') return result.value;
      return {
        id: adapter.id,
        domain: adapter.domain,
        name: adapter.domain,
        status: 'UNAVAILABLE',
        statusReason:
          result.reason instanceof Error ? result.reason.message : 'anchor snapshot failed unexpectedly',
        seps: [],
        rails: [],
        healthy: false,
        network: 'testnet',
        fetchedAt: new Date().toISOString(),
      } satisfies AnchorSnapshot;
    });
  }
}

/** Parse `ANCHOR_DISCOVERY_DOMAINS` (comma-separated), defaulting to the public reference anchors. */
export function createAnchorRegistry(
  config: Pick<AppConfig, 'ANCHOR_DISCOVERY_DOMAINS'>,
  trMock: AnchorAdapter,
  opts: AnchorRegistryOptions = {},
): AnchorRegistry {
  const raw = config.ANCHOR_DISCOVERY_DOMAINS;
  const domains = (raw && raw.trim().length > 0 ? raw.split(',') : DEFAULT_DISCOVERY_DOMAINS)
    .map((d) => d.trim())
    .filter((d) => d.length > 0 && d !== trMock.domain);
  return new AnchorRegistry(trMock, domains, opts);
}
