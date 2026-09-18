import { TransactionBuilder } from '@stellar/stellar-sdk';
import { TrinqaPolicyAdapter } from '../adapters/trinqa-policy.adapter.js';
import type { AppConfig } from '../config/env.js';
import { isDemoSignerAvailable } from '../config/env.js';
import type { PolicyBuildRequest, PolicyView } from '../domain/policy.js';
import { StellarService } from './stellar.service.js';

export class PolicyService {
  readonly adapter: TrinqaPolicyAdapter;

  constructor(
    private readonly config: AppConfig,
    private readonly stellar: StellarService,
  ) {
    this.adapter = new TrinqaPolicyAdapter(config);
  }

  getPolicy(accountId: string): Promise<PolicyView> {
    return this.adapter.getPolicy(accountId);
  }

  async buildTransaction(body: PolicyBuildRequest): Promise<{
    action: PolicyBuildRequest['action'];
    unsignedXdr: string;
    contractId: string;
  }> {
    const { accountId } = body;
    switch (body.action) {
      case 'set_policy':
        return { action: body.action, ...(await this.adapter.buildSetPolicy(accountId, body.policy)) };
      case 'update_risk':
        return {
          action: body.action,
          ...(await this.adapter.buildUpdateRisk(accountId, body.riskProfile)),
        };
      case 'update_target_date':
        return {
          action: body.action,
          ...(await this.adapter.buildUpdateTargetDate(accountId, body.targetTimestamp)),
        };
      case 'set_strategy_allowed':
        return {
          action: body.action,
          ...(await this.adapter.buildSetStrategyAllowed(accountId, body.strategy, body.allowed)),
        };
      case 'authorize_allocation':
        return {
          action: body.action,
          ...(await this.adapter.buildAuthorizeAllocation(accountId, body.strategy, body.amountBps)),
        };
      case 'authorize_rebalance':
        return {
          action: body.action,
          ...(await this.adapter.buildAuthorizeRebalance(
            accountId,
            body.fromStrategy,
            body.toStrategy,
          )),
        };
      case 'pause_automation':
        return {
          action: body.action,
          ...(await this.adapter.buildPauseAutomation(accountId, body.paused)),
        };
      default: {
        const _exhaustive: never = body;
        throw new Error(`Unsupported policy action: ${String(_exhaustive)}`);
      }
    }
  }

  async submitSignedPolicyTx(signedXdr: string): Promise<{ hash: string; successful: boolean }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.stellar.networkPassphrase);
    const sent = await this.stellar.rpc.sendTransaction(tx);
    if (sent.status === 'ERROR') {
      throw new Error(`Policy tx failed: ${sent.errorResult?.toXDR('base64') ?? sent.status}`);
    }
    if (sent.status === 'PENDING') {
      const hash = sent.hash;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const txResult = await this.stellar.rpc.getTransaction(hash);
        if (txResult.status === 'SUCCESS') {
          return { hash, successful: true };
        }
        if (txResult.status === 'FAILED') {
          throw new Error(`Policy tx failed on ledger: ${hash}`);
        }
      }
      return { hash, successful: false };
    }
    return { hash: sent.hash, successful: true };
  }

  /** Testnet-only helper when demo signer env is enabled. */
  signWithDemoSigner(unsignedXdr: string): string {
    if (!isDemoSignerAvailable() || !this.config.DEMO_SIGNER_SECRET) {
      throw new Error('Demo signer is not enabled');
    }
    return this.stellar.signXdr(unsignedXdr, this.config.DEMO_SIGNER_SECRET);
  }
}
