import type { DecimalString } from './money.js';

export type RiskTier = 'conservative' | 'balanced' | 'growth';

export type YieldStrategy = {
  id: string;
  name: string;
  /** Trinqa product classification — not a separate on-chain vault. */
  risk: RiskTier;
  estimatedApy: number;
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
};

export function riskTierFromProfile(riskProfile: number): RiskTier {
  if (riskProfile <= 0) return 'conservative';
  if (riskProfile === 1) return 'balanced';
  return 'growth';
}

export function strategyIdForVault(vaultAddress: string): string {
  return `defindex:${vaultAddress}`;
}
