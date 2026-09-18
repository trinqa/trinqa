import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import { ApiError } from '../domain/api-errors.js';
import { toAtomic } from '../domain/money.js';
import {
  daysFromTargetDateIso,
  daysUntilTargetTimestamp,
  toRecommendationPayload,
} from '../domain/yield-recommendation.js';
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
    if (!this.defindex.vaultAddress) return [];
    const riskProfile = accountId
      ? ((await this.policy.getPolicy(accountId)).riskProfile ?? 1)
      : 1;
    const one = await this.defindex.normalizeStrategy(riskProfile);
    return one ? [one] : [];
  }

  async rankedStrategies(accountId: string, daysToTarget: number) {
    const policy = await this.policy.getPolicy(accountId);
    const strategies = await this.listStrategies(accountId);
    return this.riskEngine.rankStrategies(strategies, policy.riskProfile ?? 1, daysToTarget);
  }

  async resolveDaysToTarget(
    accountId: string,
    input: { targetDate?: string; daysToTarget?: number },
  ): Promise<{ daysToTarget: number; source: 'query_days' | 'query_date' | 'policy' | 'default' }> {
    if (input.daysToTarget !== undefined && Number.isFinite(input.daysToTarget)) {
      return {
        daysToTarget: Math.max(0, Math.floor(input.daysToTarget)),
        source: 'query_days',
      };
    }
    if (input.targetDate) {
      return { daysToTarget: daysFromTargetDateIso(input.targetDate), source: 'query_date' };
    }
    const policy = await this.policy.getPolicy(accountId);
    const fromPolicy = daysUntilTargetTimestamp(policy.targetTimestamp);
    if (fromPolicy !== undefined) {
      return { daysToTarget: fromPolicy, source: 'policy' };
    }
    return { daysToTarget: 365, source: 'default' };
  }

  async getRecommendations(
    accountId: string,
    input: { targetDate?: string; daysToTarget?: number },
  ) {
    const policy = await this.policy.getPolicy(accountId);
    const { daysToTarget, source: horizonSource } = await this.resolveDaysToTarget(accountId, input);
    const ranked = await this.rankedStrategies(accountId, daysToTarget);
    const recommendations = ranked.map((s, i) => toRecommendationPayload(s, i + 1));
    const top = recommendations[0] ?? null;
    const liquidityNote =
      daysToTarget < 30 && top && top.withdrawalAvailability !== 'flexible'
        ? 'Consider shifting toward flexible liquidity as your target date approaches.'
        : null;

    return {
      accountId,
      daysToTarget,
      horizonSource,
      targetTimestamp: policy.targetTimestamp ?? null,
      riskProfile: policy.riskProfile ?? 1,
      recommendation: top,
      recommendations,
      liquidityShiftNote: liquidityNote,
    };
  }

  async getPositions(accountId: string) {
    if (!this.defindex.isConfigured || !this.defindex.vaultAddress) return [];
    const strategyId = strategyIdForVault(this.defindex.vaultAddress);
    try {
      const pos = await this.defindex.normalizePosition(accountId, strategyId);
      return pos ? [pos] : [];
    } catch {
      return [];
    }
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
    const expectedId = strategyIdForVault(vault);
    if (params.strategyId !== expectedId) {
      throw new ApiError('VALIDATION_ERROR', 'strategyId does not match configured vault', 400);
    }
    const atomic = toAtomic(params.amount, params.assetDecimals ?? 7);
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
    const expectedId = strategyIdForVault(vault);
    if (params.strategyId !== expectedId) {
      throw new ApiError('VALIDATION_ERROR', 'strategyId does not match configured vault', 400);
    }
    if (params.shares) {
      const res = await this.defindex.withdrawShares(params.accountId, BigInt(params.shares));
      return { unsignedXdr: res.xdr, vaultAddress: vault, strategyId: params.strategyId };
    }
    if (!params.amount) {
      throw new ApiError('VALIDATION_ERROR', 'amount or shares required', 400);
    }
    const atomic = toAtomic(params.amount, params.assetDecimals ?? 7);
    const res = await this.defindex.withdrawFromVault(params.accountId, [atomic]);
    return { unsignedXdr: res.xdr, vaultAddress: vault, strategyId: params.strategyId };
  }

  private requireConfigured() {
    if (!this.defindex.isConfigured) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex is not configured', 503);
    }
  }
}
