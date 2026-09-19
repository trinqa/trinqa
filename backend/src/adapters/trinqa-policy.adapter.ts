import { Client } from '@stellar/stellar-sdk/contract';
import type { AppConfig } from '../config/env.js';
import { loadTestnetDeployment } from '../config/deployments.js';
import type { UserPolicyInput } from '../domain/policy.js';
import { policyStrategySymbol, policyViewFromNative } from '../domain/policy.js';

type ContractClient = Client & {
  get_policy: (args: { user: string }) => Promise<{ result?: unknown; simulate: () => Promise<void>; toXDR: () => string }>;
  set_policy: (
    args: { user: string; policy: Record<string, unknown> },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  update_risk: (
    args: { user: string; risk_profile: number },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  update_target_date: (
    args: { user: string; target_timestamp: bigint },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  set_strategy_allowed: (
    args: { user: string; strategy: string; allowed: boolean },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  authorize_allocation: (
    args: { user: string; strategy: string; amount_bps: number },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  authorize_rebalance: (
    args: { user: string; from_strategy: string; to_strategy: string },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
  pause_automation: (
    args: { user: string; paused: boolean },
    opts?: { simulate?: boolean },
  ) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>;
};

function toContractPolicy(policy: UserPolicyInput) {
  return {
    risk_profile: policy.riskProfile,
    target_timestamp: policy.targetTimestamp,
    liquidity_target_bps: policy.liquidityTargetBps,
    automation_paused: policy.automationPaused,
    allowed_strategies: policy.allowedStrategies.map(policyStrategySymbol),
  };
}

export class TrinqaPolicyAdapter {
  readonly contractId: string;
  readonly wasmHash: string;
  constructor(private readonly config: AppConfig) {
    const deployment = loadTestnetDeployment();
    this.contractId = config.POLICY_CONTRACT_ID ?? deployment.contractId;
    this.wasmHash = config.POLICY_WASM_HASH ?? deployment.wasmHash;
  }

  private clientOptions(publicKey: string) {
    return {
      contractId: this.contractId,
      rpcUrl: this.config.STELLAR_RPC_URL,
      networkPassphrase: this.config.STELLAR_PASSPHRASE,
      publicKey,
    };
  }

  /** Fresh client per account — simulation source must match the signer. */
  private async clientFor(publicKey: string): Promise<ContractClient> {
    return Client.fromWasmHash(this.wasmHash, this.clientOptions(publicKey), 'hex') as Promise<ContractClient>;
  }

  async getPolicy(accountId: string) {
    const deployment = loadTestnetDeployment();
    const simulationSource = deployment.deployerPublicKey ?? accountId;
    const client = await this.clientFor(simulationSource);
    try {
      const assembled = await client.get_policy({ user: accountId });
      if (assembled.result === undefined) {
        await assembled.simulate();
      }
      const native = assembled.result as Record<string, unknown> | undefined;
      return policyViewFromNative(accountId, native);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('PolicyNotFound') ||
        message.includes('Error(Contract, #1)') ||
        message.includes('Account not found')
      ) {
        return policyViewFromNative(accountId, null);
      }
      throw err;
    }
  }

  private async buildTx(
    accountId: string,
    build: (client: ContractClient) => Promise<{ simulate: () => Promise<void>; toXDR: () => string }>,
  ): Promise<{ unsignedXdr: string; contractId: string }> {
    const client = await this.clientFor(accountId);
    const assembled = await build(client);
    await assembled.simulate();
    return { unsignedXdr: assembled.toXDR(), contractId: this.contractId };
  }

  buildSetPolicy(accountId: string, policy: UserPolicyInput) {
    return this.buildTx(accountId, (client) =>
      client.set_policy({ user: accountId, policy: toContractPolicy(policy) }, { simulate: true }),
    );
  }

  buildUpdateRisk(accountId: string, riskProfile: number) {
    return this.buildTx(accountId, (client) =>
      client.update_risk({ user: accountId, risk_profile: riskProfile }, { simulate: true }),
    );
  }

  buildUpdateTargetDate(accountId: string, targetTimestamp: bigint) {
    return this.buildTx(accountId, (client) =>
      client.update_target_date(
        { user: accountId, target_timestamp: targetTimestamp },
        { simulate: true },
      ),
    );
  }

  buildSetStrategyAllowed(accountId: string, strategy: string, allowed: boolean) {
    return this.buildTx(accountId, (client) =>
      client.set_strategy_allowed(
        { user: accountId, strategy: policyStrategySymbol(strategy), allowed },
        { simulate: true },
      ),
    );
  }

  buildAuthorizeAllocation(accountId: string, strategy: string, amountBps: number) {
    return this.buildTx(accountId, (client) =>
      client.authorize_allocation(
        { user: accountId, strategy: policyStrategySymbol(strategy), amount_bps: amountBps },
        { simulate: true },
      ),
    );
  }

  buildAuthorizeRebalance(accountId: string, fromStrategy: string, toStrategy: string) {
    return this.buildTx(accountId, (client) =>
      client.authorize_rebalance(
        {
          user: accountId,
          from_strategy: policyStrategySymbol(fromStrategy),
          to_strategy: policyStrategySymbol(toStrategy),
        },
        { simulate: true },
      ),
    );
  }

  buildPauseAutomation(accountId: string, paused: boolean) {
    return this.buildTx(accountId, (client) =>
      client.pause_automation({ user: accountId, paused }, { simulate: true }),
    );
  }
}
