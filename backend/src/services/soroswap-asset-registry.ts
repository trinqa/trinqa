import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';

const TTL_MS = 10 * 60 * 1000;

type CacheEntry = { contractId: string; fetchedAt: number };

type AssetRow = {
  code?: string;
  assetCode?: string;
  issuer?: string;
  contract?: string;
  contractId?: string;
};

function flattenAssetList(list: unknown): AssetRow[] {
  if (Array.isArray(list)) return list as AssetRow[];
  if (list && typeof list === 'object') {
    const o = list as Record<string, unknown>;
    if (Array.isArray(o.assets)) return o.assets as AssetRow[];
    if (Array.isArray(o.items)) return o.items as AssetRow[];
  }
  return [];
}

export class SoroswapAssetRegistry {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly soroswap: SoroswapAdapter) {}

  private cacheKey(assetCode: string, issuer?: string): string {
    return issuer ? `${assetCode}:${issuer}` : assetCode;
  }

  async resolveClassicAsset(assetCode: string, issuer?: string): Promise<string | null> {
    const key = this.cacheKey(assetCode, issuer);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.fetchedAt < TTL_MS) {
      return hit.contractId;
    }
    if (!this.soroswap.isConfigured) {
      return null;
    }
    try {
      const raw = await this.soroswap.discoverAssets();
      const list = flattenAssetList(raw);
      const match = list.find((a) => {
        const code = a.code ?? a.assetCode;
        if (code !== assetCode) return false;
        if (issuer && a.issuer && a.issuer !== issuer) return false;
        return true;
      });
      const contractId = match?.contract ?? match?.contractId ?? null;
      if (contractId) {
        this.cache.set(key, { contractId, fetchedAt: Date.now() });
      }
      return contractId;
    } catch {
      return null;
    }
  }

  async canSwap(fromCode: string, toCode: string, usdcIssuer: string): Promise<boolean> {
    const from =
      fromCode === 'XLM'
        ? await this.resolveClassicAsset('XLM')
        : await this.resolveClassicAsset(fromCode, usdcIssuer);
    const to =
      toCode === 'XLM'
        ? await this.resolveClassicAsset('XLM')
        : await this.resolveClassicAsset(toCode, usdcIssuer);
    return Boolean(from && to && from !== to);
  }
}
