import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import type { AppConfig } from '../config/env.js';
import {
  type RiskTier,
  type YieldPosition,
  type YieldStrategy,
  riskTierFromProfile,
  strategyIdForVault,
} from '../domain/yield.js';
import { fromAtomic } from '../domain/money.js';

export type DefindexHealth = {
  ok: boolean;
  configured: boolean;
  vaultAddress: string | null;
  detail?: unknown;
  error?: string;
};

export class DefindexYieldAdapter {
  private readonly sdk: DefindexSDK | null;
  readonly vaultAddress: string | null;
  readonly network = SupportedNetworks.TESTNET;

  constructor(private readonly config: AppConfig) {
    this.vaultAddress = config.DEFINDEX_VAULT_ADDRESS ?? null;
    if (config.DEFINDEX_API_KEY) {
      this.sdk = new DefindexSDK({
        apiKey: config.DEFINDEX_API_KEY,
        baseUrl: config.DEFINDEX_API_URL,
        defaultNetwork: SupportedNetworks.TESTNET,
      });
    } else {
      this.sdk = null;
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.sdk && this.vaultAddress);
  }

  requireSdk(): DefindexSDK {
    if (!this.sdk) {
      throw new Error('DEFINDEX_API_KEY is not configured');
    }
    return this.sdk;
  }

  requireVault(): string {
    if (!this.vaultAddress) {
      throw new Error('DEFINDEX_VAULT_ADDRESS is not configured');
    }
    return this.vaultAddress;
  }

  async healthCheck(): Promise<DefindexHealth> {
    if (!this.sdk) {
      return { ok: false, configured: false, vaultAddress: this.vaultAddress, error: 'missing_api_key' };
    }
    try {
      const detail = await this.sdk.healthCheck();
      if (this.vaultAddress) {
        await this.sdk.getVaultInfo(this.vaultAddress, this.network);
      }
      return { ok: true, configured: Boolean(this.vaultAddress), vaultAddress: this.vaultAddress, detail };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, configured: Boolean(this.vaultAddress), vaultAddress: this.vaultAddress, error: message };
    }
  }

  async getVaultInfo() {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    return sdk.getVaultInfo(vault, this.network);
  }

  async getVaultAPY(): Promise<number> {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    const { apy } = await sdk.getVaultAPY(vault, this.network);
    return apy;
  }

  async getVaultBalance(accountId: string) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    return sdk.getVaultBalance(vault, accountId, this.network);
  }

  async depositToVault(accountId: string, amounts: number[], invest = false) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    return sdk.depositToVault(
      vault,
      { amounts, invest, caller: accountId },
      this.network,
    );
  }

  async withdrawFromVault(accountId: string, amounts: number[]) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    return sdk.withdrawFromVault(
      vault,
      { amounts, caller: accountId },
      this.network,
    );
  }

  async withdrawShares(accountId: string, shares: number) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    return sdk.withdrawShares(
      vault,
      { shares, caller: accountId },
      this.network,
    );
  }

  async sendSignedXdr(signedXdr: string) {
    const sdk = this.requireSdk();
    return sdk.sendTransaction(signedXdr, this.network);
  }

  /** Map vault + policy risk into Trinqa strategy cards (same vault, tier metadata). */
  normalizeStrategies(riskProfile = 1): YieldStrategy[] {
    const vault = this.vaultAddress;
    if (!vault) {
      return [];
    }
    const tiers: RiskTier[] = ['conservative', 'balanced', 'growth'];
    const availability: Record<RiskTier, YieldStrategy['withdrawalAvailability']> = {
      conservative: 'flexible',
      balanced: '30d',
      growth: '90d',
    };
    void riskProfile;
    return tiers.map((risk) => ({
      id: strategyIdForVault(vault, risk),
      name: `DeFindex ${risk.charAt(0).toUpperCase()}${risk.slice(1)}`,
      risk,
      estimatedApy: 0,
      withdrawalAvailability: availability[risk],
      vaultAddress: vault,
      symbol: undefined,
    }));
  }

  async normalizePosition(accountId: string, strategyId: string): Promise<YieldPosition | null> {
    if (!this.isConfigured) {
      return null;
    }
    const balance = await this.getVaultBalance(accountId);
    const vault = this.requireVault();
    const shares = String(balance.dfTokens ?? 0);
    const underlying = (balance.underlyingBalance ?? []).map((n: number) =>
      fromAtomic(BigInt(Math.round(n)), 7),
    );
    const totalUnderlying = underlying[0] ?? '0';
    return {
      strategyId,
      accountId,
      positionValue: { assetCode: 'USDC', amount: totalUnderlying },
      shares,
      underlyingBalances: underlying,
    };
  }
}
