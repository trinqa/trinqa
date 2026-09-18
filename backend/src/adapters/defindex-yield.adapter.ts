import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import type { AppConfig } from '../config/env.js';
import {
  intrinsicRiskTierForVault,
  type YieldPosition,
  type YieldStrategy,
  strategyIdForVault,
} from '../domain/yield.js';
import { providerNumberToDecimalString } from '../domain/provider-amount.js';
import { bigintToSafeNumber } from '../domain/safe-integer.js';
import { normalizeProviderError } from '../util/provider-error.js';
import { ApiError } from '../domain/api-errors.js';

export type DefindexHealth = {
  ok: boolean;
  configured: boolean;
  vaultAddress: string | null;
  detail?: unknown;
  error?: string;
};

type VaultTxResponse = {
  xdr?: string | null;
  operationXDR?: string | null;
  isSmartWallet?: boolean;
};

function requireClassicXdr(res: VaultTxResponse): string {
  if (res.isSmartWallet || (res.xdr == null && res.operationXDR)) {
    throw new ApiError(
      'SMART_WALLET_FLOW_REQUIRED',
      'DeFindex returned a smart-wallet flow; classic G-account xdr required',
      422,
    );
  }
  if (!res.xdr) {
    throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex did not return unsigned XDR', 502);
  }
  return res.xdr;
}

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
      return {
        ok: false,
        configured: Boolean(this.vaultAddress),
        vaultAddress: this.vaultAddress,
        error: normalizeProviderError(err),
      };
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

  async depositToVault(accountId: string, amounts: bigint[], invest = false) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    const nums = amounts.map((a, i) => bigintToSafeNumber(a, `amounts[${i}]`));
    const res = await sdk.depositToVault(vault, { amounts: nums, invest, caller: accountId }, this.network);
    return { ...res, xdr: requireClassicXdr(res as VaultTxResponse) };
  }

  async withdrawFromVault(accountId: string, amounts: bigint[]) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    const nums = amounts.map((a, i) => bigintToSafeNumber(a, `amounts[${i}]`));
    const res = await sdk.withdrawFromVault(vault, { amounts: nums, caller: accountId }, this.network);
    return { ...res, xdr: requireClassicXdr(res as VaultTxResponse) };
  }

  async withdrawShares(accountId: string, shares: bigint) {
    const sdk = this.requireSdk();
    const vault = this.requireVault();
    const res = await sdk.withdrawShares(
      vault,
      { shares: bigintToSafeNumber(shares, 'shares'), caller: accountId },
      this.network,
    );
    return { ...res, xdr: requireClassicXdr(res as VaultTxResponse) };
  }

  async sendSignedXdr(signedXdr: string) {
    const sdk = this.requireSdk();
    return sdk.sendTransaction(signedXdr, this.network);
  }

  /** One configured vault → one real YieldStrategy (intrinsic risk from Trinqa vault metadata). */
  async normalizeStrategy(): Promise<YieldStrategy | null> {
    const vault = this.vaultAddress;
    if (!vault) return null;
    let name = `DeFindex vault ${vault.slice(0, 8)}…`;
    let symbol: string | undefined;
    let assets: string[] | undefined;
    let apy = 0;
    if (this.isConfigured) {
      try {
        const info = await this.getVaultInfo();
        name = (info as { name?: string }).name ?? name;
        symbol = (info as { symbol?: string }).symbol;
        const rawAssets = (info as { assets?: Array<{ code?: string; symbol?: string }> }).assets;
        if (rawAssets?.length) {
          assets = rawAssets.map((a) => a.code ?? a.symbol ?? 'asset').filter(Boolean);
        }
        apy = await this.getVaultAPY();
      } catch {
        // keep minimal metadata
      }
    }
    const risk = intrinsicRiskTierForVault({ name, assets });
    return {
      id: strategyIdForVault(vault),
      name,
      risk,
      estimatedApy: apy,
      withdrawalAvailability: 'flexible',
      vaultAddress: vault,
      symbol,
      assets,
      trinqaClassification: true,
    };
  }

  /** @deprecated use normalizeStrategy */
  normalizeStrategies(): YieldStrategy[] {
    const vault = this.vaultAddress;
    if (!vault) return [];
    const risk = intrinsicRiskTierForVault();
    return [
      {
        id: strategyIdForVault(vault),
        name: `DeFindex vault ${vault.slice(0, 8)}…`,
        risk,
        estimatedApy: 0,
        withdrawalAvailability: 'flexible',
        vaultAddress: vault,
        trinqaClassification: true,
      },
    ];
  }

  async normalizePosition(accountId: string, strategyId: string): Promise<YieldPosition | null> {
    if (!this.isConfigured) return null;
    const vault = this.requireVault();
    if (strategyId !== strategyIdForVault(vault)) return null;
    const balance = await this.getVaultBalance(accountId);
    const shares = String(balance.dfTokens ?? 0);
    const underlying = (balance.underlyingBalance ?? []).map((n: number, i: number) =>
      providerNumberToDecimalString(n, 7, `underlyingBalance[${i}]`),
    );
    const totalUnderlying = underlying[0] ?? '0';
    if (Number(shares) <= 0 && Number(totalUnderlying) <= 0) {
      return null;
    }
    return {
      strategyId,
      accountId,
      positionValue: { assetCode: 'USDC', amount: totalUnderlying },
      shares,
      underlyingBalances: underlying,
    };
  }

  async earningBalanceUsdc(accountId: string): Promise<string> {
    const pos = await this.normalizePosition(accountId, strategyIdForVault(this.requireVault()));
    return pos?.positionValue.amount ?? '0';
  }
}
