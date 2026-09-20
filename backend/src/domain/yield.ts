import type { DecimalString } from './money.js';

export type RiskTier = 'conservative' | 'balanced' | 'growth';

export type YieldStrategy = {
  id: string;
  name: string;
  /** Trinqa product classification — not a separate on-chain vault. */
  risk: RiskTier;
  estimatedApy: number;
  /** `fixed_apr`: rate set by the strategy contract; `provider`: DeFindex API estimate. */
  apySource?: 'provider' | 'fixed_apr';
  withdrawalAvailability: 'flexible' | '30d' | '90d';
  vaultAddress: string;
  symbol?: string;
  assets?: string[];
  /** When true, metadata is Trinqa heuristic rather than provider fact. */
  trinqaClassification?: boolean;
};

export type YieldPosition = {
  strategyId: string;
  accountId: string;
  positionValue: { assetCode: string; amount: DecimalString };
  shares: DecimalString;
  underlyingBalances: DecimalString[];
  usdcAssetIndex?: number;
};

export function riskTierFromProfile(riskProfile: number): RiskTier {
  if (riskProfile <= 0) return 'conservative';
  if (riskProfile === 1) return 'balanced';
  return 'growth';
}

export function strategyIdForVault(vaultAddress: string): string {
  return `defindex:${vaultAddress}`;
}

/** Trinqa static/metadata classification — never derived from user riskProfile. */
export function intrinsicRiskTierForVault(hints?: {
  assets?: string[];
  name?: string;
}): RiskTier {
  const assets = hints?.assets ?? [];
  const stableOnly =
    assets.length > 0 &&
    assets.every((a) => /USDC|USDT|DAI|USD|TRY/i.test(a));
  if (stableOnly) return 'conservative';
  const name = hints?.name?.toLowerCase() ?? '';
  if (/growth|lever|high.?yield|volatile/i.test(name)) return 'growth';
  return 'balanced';
}
