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
import type { OperationStore } from './operation-store.js';
import { recordOperation } from './operation-store.js';

export class YieldService {
  private readonly riskEngine = new DeterministicRiskEngine();

  constructor(
    private readonly defindex: DefindexYieldAdapter,
    private readonly policy: PolicyService,
    private readonly operations: OperationStore,
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
    const op = await recordOperation(this.operations, {
      kind: 'yield_deposit',
      status: 'awaiting_signature',
      accountId: params.accountId,
      title: 'Yield deposit',
      amount: { assetCode: 'USDC', amount: params.amount },
      metadata: { strategyId: params.strategyId, vaultAddress: vault, provider: 'defindex' },
    });
    return {
      operationId: op.id,
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
    recordOperation?: boolean;
  }) {
    this.requireConfigured();
    const vault = this.defindex.requireVault();
    const expectedId = strategyIdForVault(vault);
    if (params.strategyId !== expectedId) {
      throw new ApiError('VALIDATION_ERROR', 'strategyId does not match configured vault', 400);
    }
    let unsignedXdr: string;
    if (params.shares) {
      const res = await this.defindex.withdrawShares(params.accountId, BigInt(params.shares));
      unsignedXdr = res.xdr;
    } else if (params.amount) {
      const atomic = toAtomic(params.amount, params.assetDecimals ?? 7);
      const res = await this.defindex.withdrawFromVault(params.accountId, [atomic]);
      unsignedXdr = res.xdr;
    } else {
      throw new ApiError('VALIDATION_ERROR', 'amount or shares required', 400);
    }
    let operationId: string | undefined;
    if (params.recordOperation !== false) {
      const op = await recordOperation(this.operations, {
        kind: 'yield_withdraw',
        status: 'awaiting_signature',
        accountId: params.accountId,
        title: 'Yield withdraw',
        amount: params.amount ? { assetCode: 'USDC', amount: params.amount } : undefined,
        metadata: { strategyId: params.strategyId, vaultAddress: vault, provider: 'defindex' },
      });
      operationId = op.id;
    }
    return {
      operationId,
      unsignedXdr,
      vaultAddress: vault,
      strategyId: params.strategyId,
    };
  }

  async executeSignedXdr(operationId: string, signedXdr: string) {
    this.requireConfigured();
    const op = await this.operations.get(operationId);
    if (!op) {
      throw new ApiError('NOT_FOUND', 'Operation not found', 404);
    }
    if (op.kind !== 'yield_deposit' && op.kind !== 'yield_withdraw') {
      throw new ApiError('VALIDATION_ERROR', 'Operation is not a yield deposit/withdraw', 409);
    }
    const result = await this.defindex.sendSignedXdr(signedXdr);
    const txHash =
      (result as { hash?: string; txHash?: string }).hash ?? (result as { txHash?: string }).txHash;
    const ok = (result as { success?: boolean }).success !== false && Boolean(txHash);
    await this.operations.update(operationId, {
      status: ok ? 'completed' : 'failed',
      externalRefs: { ...op.externalRefs, txHash },
      metadata: { ...op.metadata, providerResult: result },
    });
    if (!ok) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex transaction submission failed', 502);
    }
    return { operationId, txHash, successful: true };
  }

  private requireConfigured() {
    if (!this.defindex.isConfigured) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex is not configured', 503);
    }
  }
}
