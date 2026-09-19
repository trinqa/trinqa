import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import { ApiError } from '../domain/api-errors.js';
import { Decimal, toAtomic } from '../domain/money.js';
import {
  daysFromTargetDateIso,
  daysUntilTargetTimestamp,
  toRecommendationPayload,
} from '../domain/yield-recommendation.js';
import { strategyIdForVault, type YieldStrategy } from '../domain/yield.js';
import { DeterministicRiskEngine } from './deterministic-risk-engine.js';
import type { PolicyService } from './policy.service.js';
import type { StellarService } from './stellar.service.js';
import type { OperationStore } from './operation-store.js';
import { recordOperation } from './operation-store.js';

/** Minimum/maximum bps we'll ever pass to the policy contract's `authorize_allocation`. */
const MIN_ALLOCATION_BPS = 1;
const MAX_ALLOCATION_BPS = 10_000;
/** Used when the user's available balance can't be read — treat the deposit as "all of it". */
const DEFAULT_ALLOCATION_BPS = MAX_ALLOCATION_BPS;

type PolicyGateResult = { policyCheck: 'no_policy' | 'authorized'; amountBps?: number };

export class YieldService {
  private readonly riskEngine = new DeterministicRiskEngine();

  constructor(
    private readonly defindex: DefindexYieldAdapter,
    private readonly policy: PolicyService,
    private readonly operations: OperationStore,
    /** Optional: enables the deposit policy gate (balance read + tx-hash pinning). Without it, deposits skip the gate and execute() skips the signed-tx guard. */
    private readonly stellar?: StellarService,
  ) {}

  async listStrategies(accountId?: string): Promise<YieldStrategy[]> {
    if (!this.defindex.vaultAddress) return [];
    const one = await this.defindex.normalizeStrategy();
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

    const amountBps = await this.computeAllocationBps(params.accountId, params.amount);
    const gate = await this.checkAllocationPolicy(params.accountId, params.strategyId, amountBps);

    const atomic = toAtomic(params.amount, params.assetDecimals ?? 7);
    const res = await this.defindex.depositToVault(params.accountId, [atomic], params.invest ?? false);
    const expectedTxHash = this.stellar ? this.stellar.transactionHash(res.xdr) : undefined;
    const op = await recordOperation(this.operations, {
      kind: 'yield_deposit',
      status: 'awaiting_signature',
      accountId: params.accountId,
      title: 'Yield deposit',
      amount: { assetCode: 'USDC', amount: params.amount },
      metadata: {
        strategyId: params.strategyId,
        vaultAddress: vault,
        provider: 'defindex',
        policyCheck: gate.policyCheck,
        ...(gate.amountBps !== undefined ? { policyAmountBps: gate.amountBps } : {}),
        ...(expectedTxHash ? { expectedTxHash } : {}),
      },
    });
    return {
      operationId: op.id,
      unsignedXdr: res.xdr,
      vaultAddress: vault,
      strategyId: params.strategyId,
      policyCheck: gate.policyCheck,
    };
  }

  /**
   * Read-only Soroban simulation of `authorize_allocation` — nothing is signed or submitted.
   * PolicyNotFound (the user never opted into the policy contract, or the account doesn't
   * exist on-chain yet) is treated as "allow": the policy is opt-in, and the mobile
   * Grow-money flow writes a policy before it starts relying on it. Any other contract
   * rejection (AutomationPaused, StrategyNotAllowed, ...) blocks the deposit. A simulation
   * infrastructure failure (RPC down, unexpected error) never silently allows.
   */
  private async checkAllocationPolicy(
    accountId: string,
    strategyId: string,
    amountBps: number,
  ): Promise<PolicyGateResult> {
    let result;
    try {
      result = await this.policy.adapter.simulateAuthorizeAllocation(accountId, strategyId, amountBps);
    } catch (err) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'Policy contract simulation is unavailable', 503, {
        cause: err instanceof Error ? err.message : String(err),
      });
    }
    if (result.ok) {
      return { policyCheck: 'authorized', amountBps };
    }
    if (result.reason === 'PolicyNotFound') {
      return { policyCheck: 'no_policy' };
    }
    throw new ApiError('POLICY_DENIED', `Policy contract denied this allocation: ${result.reason}`, 403, {
      reason: result.reason,
      strategy: strategyId,
    });
  }

  /**
   * The deposit as a share (bps) of the user's available USDC wallet balance (i.e. not
   * counting funds already earning), clamped to [1, 10000]. Falls back to 10000 (treat the
   * whole deposit as "all of it") whenever the balance can't be read, since we would
   * otherwise have to guess a denominator.
   */
  private async computeAllocationBps(accountId: string, amount: string): Promise<number> {
    if (!this.stellar) return DEFAULT_ALLOCATION_BPS;
    try {
      const balances = await this.stellar.getBalances(accountId);
      const usdc = this.stellar.usdc;
      const line = balances.find((b) => b.assetCode === usdc.code && b.assetIssuer === usdc.issuer);
      if (!line) return DEFAULT_ALLOCATION_BPS;
      const available = new Decimal(line.balance);
      if (!available.isFinite() || available.lte(0)) return DEFAULT_ALLOCATION_BPS;
      const requested = new Decimal(amount);
      if (!requested.isFinite() || requested.lte(0)) return MIN_ALLOCATION_BPS;
      const bps = requested.div(available).mul(MAX_ALLOCATION_BPS).toDecimalPlaces(0, Decimal.ROUND_CEIL);
      return Math.min(MAX_ALLOCATION_BPS, Math.max(MIN_ALLOCATION_BPS, bps.toNumber()));
    } catch {
      return DEFAULT_ALLOCATION_BPS;
    }
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
      const expectedTxHash = this.stellar ? this.stellar.transactionHash(unsignedXdr) : undefined;
      const op = await recordOperation(this.operations, {
        kind: 'yield_withdraw',
        status: 'awaiting_signature',
        accountId: params.accountId,
        title: 'Yield withdraw',
        amount: params.amount ? { assetCode: 'USDC', amount: params.amount } : undefined,
        metadata: {
          strategyId: params.strategyId,
          vaultAddress: vault,
          provider: 'defindex',
          ...(expectedTxHash ? { expectedTxHash } : {}),
        },
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
    if (op.status === 'completed') {
      throw new ApiError('ALREADY_COMPLETED', 'Operation already completed', 409);
    }
    this.assertSignedMatchesBuilt(
      (op.metadata as { expectedTxHash?: string } | undefined)?.expectedTxHash,
      signedXdr,
    );
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

  /** Rejects a signed envelope whose (network-bound, signature-independent) hash differs from what we built. */
  private assertSignedMatchesBuilt(expectedTxHash: string | undefined, signedXdr: string): void {
    if (!expectedTxHash || !this.stellar) return;
    let actual: string;
    try {
      actual = this.stellar.transactionHash(signedXdr);
    } catch {
      throw new ApiError('VALIDATION_ERROR', 'signedXdr is not a valid transaction envelope', 400);
    }
    if (actual !== expectedTxHash) {
      throw new ApiError(
        'SIGNED_TX_MISMATCH',
        'Signed transaction does not match the transaction built for this step',
        409,
      );
    }
  }

  private requireConfigured() {
    if (!this.defindex.isConfigured) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex is not configured', 503);
    }
  }
}
