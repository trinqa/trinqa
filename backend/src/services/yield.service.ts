import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import { ApiError } from '../domain/api-errors.js';
import { toAtomic } from '../domain/money.js';
import { strategyIdForVault, type YieldStrategy } from '../domain/yield.js';
import { DeterministicRiskEngine } from './deterministic-risk-engine.js';
import type { PolicyService } from './policy.service.js';

export class YieldService {
  private readonly riskEngine = new DeterministicRiskEngine();

  constructor(
    private readonly defindex: DefindexYieldAdapter,
    private readonly policy: PolicyService,
  ) {}

  async listStrategies(accountId?: string): Promise<YieldStrategy[]> {
    if (!this.defindex.vaultAddress) {
      return [];
    }
    let apy = 0;
    if (this.defindex.isConfigured) {
      try {
        apy = await this.defindex.getVaultAPY();
      } catch {
        apy = 0;
      }
    }
    const riskProfile = accountId
      ? ((await this.policy.getPolicy(accountId)).riskProfile ?? 1)
      : 1;
    const base = this.defindex.normalizeStrategies(riskProfile);
    return base.map((s) => ({ ...s, estimatedApy: apy }));
  }

  async rankedStrategies(accountId: string, daysToTarget: number) {
    const policy = await this.policy.getPolicy(accountId);
    const strategies = await this.listStrategies(accountId);
    return this.riskEngine.rankStrategies(strategies, policy.riskProfile ?? 1, daysToTarget);
  }

  async getPositions(accountId: string) {
    const strategies = await this.listStrategies(accountId);
    const positions = [];
    for (const s of strategies) {
      if (!this.defindex.isConfigured) continue;
      try {
        const pos = await this.defindex.normalizePosition(accountId, s.id);
        if (pos && Number(pos.shares) > 0) {
          positions.push(pos);
        }
      } catch {
        // vault read failures surface as empty position set
      }
    }
    return positions;
  }

  async buildDeposit(params: {
    accountId: string;
    strategyId: string;
    amount: string;
    assetDecimals?: number;
    invest?: boolean;
  }) {
    this.requireConfigured();
    const vault = this.defindex.requireVault();
    const expectedId = strategyIdForVault(vault, 'balanced');
    if (!params.strategyId.includes(vault.slice(0, 8))) {
      throw new ApiError('VALIDATION_ERROR', 'strategyId does not match configured vault', 400);
    }
    void expectedId;
    const atomic = Number(toAtomic(params.amount, params.assetDecimals ?? 7));
    const res = await this.defindex.depositToVault(params.accountId, [atomic], params.invest ?? false);
    return {
      unsignedXdr: res.xdr,
      vaultAddress: vault,
      strategyId: params.strategyId,
    };
  }

  async buildWithdraw(params: {
    accountId: string;
    strategyId: string;
    amount?: string;
    shares?: string;
    assetDecimals?: number;
  }) {
    this.requireConfigured();
    const vault = this.defindex.requireVault();
    if (params.shares) {
      const res = await this.defindex.withdrawShares(params.accountId, Number(params.shares));
      return { unsignedXdr: res.xdr, vaultAddress: vault, strategyId: params.strategyId };
    }
    if (!params.amount) {
      throw new ApiError('VALIDATION_ERROR', 'amount or shares required', 400);
    }
    const atomic = Number(toAtomic(params.amount, params.assetDecimals ?? 7));
    const res = await this.defindex.withdrawFromVault(params.accountId, [atomic]);
    return { unsignedXdr: res.xdr, vaultAddress: vault, strategyId: params.strategyId };
  }

  private requireConfigured() {
    if (!this.defindex.isConfigured) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex is not configured', 503);
    }
  }
}
