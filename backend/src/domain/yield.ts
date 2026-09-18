import type { DecimalString } from './money.js';

export type RiskTier = 'conservative' | 'balanced' | 'growth';

export type YieldStrategy = {
  id: string;
  name: string;
  risk: RiskTier;
  estimatedApy: number;
  withdrawalAvailability: 'flexible' | '30d' | '90d';
  vaultAddress: string;
  symbol?: string;
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

export function strategyIdForVault(vaultAddress: string, risk: RiskTier): string {
  const suffix = risk === 'conservative' ? 'cons' : risk === 'balanced' ? 'bal' : 'growth';
  return `defindex:${vaultAddress.slice(0, 8)}:${suffix}`;
}
