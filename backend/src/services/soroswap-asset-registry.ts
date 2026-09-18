import { SupportedAssetLists } from '@soroswap/sdk';
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
    if (Array.isArray(o.tokens)) return o.tokens as AssetRow[];
  }
  return [];
}

function rowContractId(row: AssetRow): string | null {
  const id = row.contract ?? row.contractId;
  return typeof id === 'string' && id.length >= 10 ? id : null;
}

function rowCode(row: AssetRow): string | undefined {
  const code = row.code ?? row.assetCode;
  return typeof code === 'string' ? code : undefined;
}

export class SoroswapAssetRegistry {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly soroswap: SoroswapAdapter) {}

  private cacheKey(assetCode: string, issuer?: string): string {
    return issuer ? `${assetCode}:${issuer}` : assetCode;
  }

  private async loadTokenRows(): Promise<AssetRow[]> {
    const raw = await this.soroswap.discoverAssets(SupportedAssetLists.SOROSWAP);
    return flattenAssetList(raw);
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
      const list = await this.loadTokenRows();
      const match = list.find((a) => {
        const code = rowCode(a);
        if (code !== assetCode) return false;
        if (issuer && a.issuer && a.issuer !== issuer) return false;
        return Boolean(rowContractId(a));
      });
      const contractId = match ? rowContractId(match) : null;
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
