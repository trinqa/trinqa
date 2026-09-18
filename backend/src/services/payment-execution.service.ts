import type { AppConfig } from '../config/env.js';
import { ApiError } from '../domain/api-errors.js';
import type { PaymentExecutionStep } from '../domain/payment.js';
import { Decimal } from '../domain/money.js';
import { strategyIdForVault } from '../domain/yield.js';
import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';
import type { StellarService } from './stellar.service.js';
import type { QuoteStore } from './quote-store.service.js';
import type { OperationStore } from './operation-store.js';
import type { YieldService } from './yield.service.js';

type PaymentMeta = {
  quoteId: string;
  routeType: string;
  currentStep?: PaymentExecutionStep;
  completedSteps?: PaymentExecutionStep[];
  funding?: Record<string, unknown>;
  earnStrategyId?: string;
  earnContribution?: string;
  soroswapQuote?: unknown;
};

export class PaymentExecutionService {
  constructor(
    private readonly config: AppConfig,
    private readonly stellar: StellarService,
    private readonly defindex: DefindexYieldAdapter,
    private readonly soroswap: SoroswapAdapter,
    private readonly yieldSvc: YieldService,
    private readonly quotes: QuoteStore,
    private readonly operations: OperationStore,
  ) {}

  async executeStep(operationId: string, step: PaymentExecutionStep, signedXdr: string) {
    const op = await this.operations.get(operationId);
    if (!op) {
      throw new ApiError('NOT_FOUND', 'Operation not found', 404);
    }
    const meta = (op.metadata ?? {}) as PaymentMeta;
    if (meta.currentStep !== step) {
      throw new ApiError('VALIDATION_ERROR', `Expected step ${meta.currentStep ?? 'unknown'}, got ${step}`, 409);
    }

    if (step === 'yield_withdraw') {
      if (!this.defindex.isConfigured) {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex not configured', 503);
      }
      const result = await this.defindex.sendSignedXdr(signedXdr);
      const txHash =
        (result as { hash?: string; txHash?: string }).hash ??
        (result as { txHash?: string }).txHash;
      const ok = (result as { success?: boolean }).success !== false && Boolean(txHash);
      if (!ok) {
        await this.operations.update(operationId, {
          status: 'failed',
          metadata: { ...meta, lastError: 'defindex_withdraw_failed' },
        });
        throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex withdraw submission failed', 502);
      }
      const completed = [...(meta.completedSteps ?? []), 'yield_withdraw'];
      await this.operations.update(operationId, {
        status: 'awaiting_signature',
        externalRefs: { ...op.externalRefs, txHash },
        metadata: {
          ...meta,
          completedSteps: completed,
          currentStep: 'stellar_payment',
          yieldWithdrawTxHash: txHash,
        },
      });
      const quote = this.quotes.get(meta.quoteId);
      const payload = quote.providerPayload as { recipient: string; fromAccount: string };
      const amount = quote.source.amount;
      const unsignedXdr = await this.stellar.buildPaymentXdr(payload.fromAccount, payload.recipient, amount);
      return {
        operationId,
        stepCompleted: 'yield_withdraw',
        nextStep: 'stellar_payment' as const,
        unsignedXdr,
        networkPassphrase: this.stellar.networkPassphrase,
        txHash,
      };
    }

    if (step === 'stellar_payment') {
      const result = await this.stellar.submitSignedXdr(signedXdr);
      await this.operations.update(operationId, {
        status: result.successful ? 'completed' : 'failed',
        externalRefs: { ...op.externalRefs, txHash: result.hash },
        metadata: {
          ...meta,
          completedSteps: [...(meta.completedSteps ?? []), 'stellar_payment'],
          currentStep: undefined,
        },
      });
      return { operationId, stepCompleted: 'stellar_payment', txHash: result.hash, successful: result.successful };
    }

    if (step === 'soroswap_swap') {
      const result = await this.soroswap.sendSignedXdr(signedXdr);
      await this.operations.update(operationId, {
        status: result.success ? 'completed' : 'failed',
        externalRefs: { ...op.externalRefs, txHash: result.txHash },
        metadata: {
          ...meta,
          completedSteps: [...(meta.completedSteps ?? []), 'soroswap_swap'],
          currentStep: undefined,
        },
      });
      return { operationId, stepCompleted: 'soroswap_swap', txHash: result.txHash, successful: result.success };
    }

    throw new ApiError('VALIDATION_ERROR', 'Unsupported execution step', 400);
  }

  async buildEarnUnwindStep(
    operationId: string,
    quoteId: string,
    fromAccount: string,
    earnContribution: string,
    strategyId: string,
  ) {
    const built = await this.yieldSvc.buildWithdraw({
      accountId: fromAccount,
      strategyId,
      amount: earnContribution,
    });
    await this.operations.update(operationId, {
      status: 'awaiting_signature',
      metadata: {
        quoteId,
        currentStep: 'yield_withdraw',
        completedSteps: [],
        earnContribution,
        earnStrategyId: strategyId,
      },
    });
    return {
      operationId,
      unsignedXdr: built.unsignedXdr,
      currentStep: 'yield_withdraw' as const,
      networkPassphrase: this.stellar.networkPassphrase,
    };
  }

  resolveEarnStrategyId(): string {
    const vault = this.defindex.vaultAddress;
    if (!vault) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'DeFindex vault not configured', 503);
    }
    return strategyIdForVault(vault);
  }

  computeFunding(
    available: string,
    earning: string,
    requested: string,
  ): {
    availableContribution: string;
    earnContribution: string;
    requiresEarnUnwind: boolean;
    totalBalance: string;
  } {
    const avail = new Decimal(available);
    const earn = new Decimal(earning);
    const req = new Decimal(requested);
    const total = avail.plus(earn);
    if (req.gt(total)) {
      throw new ApiError('INSUFFICIENT_BALANCE', 'Insufficient total balance (available + earning)', 422, {
        available,
        earning,
        requested,
      });
    }
    const availCont = Decimal.min(avail, req);
    const earnCont = req.minus(availCont);
    const fmt = (d: InstanceType<typeof Decimal>) => d.toFixed(7);
    return {
      availableContribution: fmt(availCont),
      earnContribution: fmt(earnCont),
      requiresEarnUnwind: earnCont.gt(0),
      totalBalance: fmt(total),
    };
  }
}
