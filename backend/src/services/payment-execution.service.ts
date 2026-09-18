import type { AppConfig } from '../config/env.js';
import { ApiError } from '../domain/api-errors.js';
import type { PaymentExecutionStep, PaymentRouteType } from '../domain/payment.js';
import { Decimal } from '../domain/money.js';
import { strategyIdForVault } from '../domain/yield.js';
import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';
import type { TrMockAnchorAdapter } from '../adapters/tr-mock-anchor.adapter.js';
import type { StellarService } from './stellar.service.js';
import type { QuoteStore } from './quote-store.service.js';
import type { OperationStore } from './operation-store.js';
import type { YieldService } from './yield.service.js';
import type { AnchorSessionStore } from './anchor-session-store.service.js';
type PaymentMeta = {
  quoteId: string;
  routeType: PaymentRouteType;
  currentStep?: PaymentExecutionStep;
  completedSteps?: PaymentExecutionStep[];
  funding?: Record<string, unknown>;
  earnStrategyId?: string;
  earnContribution?: string;
  soroswapQuote?: unknown;
  anchorSessionId?: string;
  anchorQuoteId?: string;
};

export class PaymentExecutionService {
  constructor(
    private readonly config: AppConfig,
    private readonly stellar: StellarService,
    private readonly defindex: DefindexYieldAdapter,
    private readonly soroswap: SoroswapAdapter,
    private readonly anchor: TrMockAnchorAdapter,
    private readonly anchorSessions: AnchorSessionStore,
    private readonly yieldSvc: YieldService,
    private readonly quotes: QuoteStore,
    private readonly operations: OperationStore,
  ) {}

  private loadQuoteForExecution(quoteId: string) {
    return this.quotes.get(quoteId);
  }

  private paymentDebitAmount(quote: ReturnType<QuoteStore['get']>, meta: PaymentMeta): string {
    const funding = quote.funding ?? (meta.funding as PaymentMeta['funding']);
    const availableContribution = (funding as { availableContribution?: string } | undefined)
      ?.availableContribution;
    if (availableContribution && !quote.funding?.requiresEarnUnwind) {
      return availableContribution;
    }
    return quote.source.amount;
  }

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

      const quote = this.loadQuoteForExecution(meta.quoteId);
      const payload = quote.providerPayload as {
        recipient: string;
        fromAccount: string;
        soroswapQuote?: unknown;
        anchorSessionId?: string;
        anchorQuoteId?: string;
      };
      const routeType = quote.routeType;
      const completed = [...(meta.completedSteps ?? []), 'yield_withdraw'];

      if (routeType === 'stellar_transfer') {
        const amount = this.paymentDebitAmount(quote, meta);
        const unsignedXdr = await this.stellar.buildPaymentXdr(payload.fromAccount, payload.recipient, amount);
        await this.operations.update(operationId, {
          status: 'awaiting_signature',
          externalRefs: { ...op.externalRefs, txHash },
          metadata: {
            ...meta,
            routeType,
            completedSteps: completed,
            currentStep: 'stellar_payment',
            yieldWithdrawTxHash: txHash,
          },
        });
        return {
          operationId,
          stepCompleted: 'yield_withdraw',
          nextStep: 'stellar_payment' as const,
          unsignedXdr,
          networkPassphrase: this.stellar.networkPassphrase,
          txHash,
        };
      }

      if (routeType === 'stellar_swap_transfer') {
        let swapQuote = payload.soroswapQuote ?? meta.soroswapQuote;
        if (!swapQuote) {
          throw new ApiError('QUOTE_EXPIRED', 'Missing Soroswap quote after earn unwind', 410);
        }
        const built = await this.soroswap.buildFromQuote(
          swapQuote as never,
          payload.fromAccount,
          payload.recipient,
        );
        const unsignedXdr =
          (built as { xdr?: string }).xdr ?? (built as { transactionXdr?: string }).transactionXdr;
        await this.operations.update(operationId, {
          status: 'awaiting_signature',
          externalRefs: { ...op.externalRefs, txHash },
          metadata: {
            ...meta,
            routeType,
            completedSteps: completed,
            currentStep: 'soroswap_swap',
            yieldWithdrawTxHash: txHash,
            soroswapQuote: swapQuote,
          },
        });
        return {
          operationId,
          stepCompleted: 'yield_withdraw',
          nextStep: 'soroswap_swap' as const,
          unsignedXdr,
          networkPassphrase: this.stellar.networkPassphrase,
          txHash,
        };
      }

      if (routeType === 'fiat_payout') {
        const sessionId = payload.anchorSessionId ?? meta.anchorSessionId;
        const anchorQuoteId = payload.anchorQuoteId ?? meta.anchorQuoteId;
        if (!sessionId) {
          throw new ApiError('VALIDATION_ERROR', 'Missing anchor session for TRY withdraw', 400);
        }
        const jwt = this.anchorSessions.resolve(sessionId, payload.fromAccount);
        const withdrawSession = await this.anchor.sep6Withdraw(jwt, {
          asset_code: 'USDC',
          account: payload.fromAccount,
          amount: quote.source.amount,
          dest: 'TR890009903460061605055303',
          quote_id: anchorQuoteId,
        });
        const transferId = (withdrawSession as { id?: string }).id;
        await this.operations.update(operationId, {
          status: 'processing',
          externalRefs: {
            ...op.externalRefs,
            txHash,
            anchorTransferId: transferId,
            quoteId: anchorQuoteId ?? op.externalRefs?.quoteId,
          },
          metadata: {
            ...meta,
            routeType,
            completedSteps: completed,
            currentStep: 'anchor_withdraw',
            yieldWithdrawTxHash: txHash,
            anchorWithdrawSession: withdrawSession,
          },
        });
        return {
          operationId,
          stepCompleted: 'yield_withdraw',
          nextStep: 'anchor_withdraw' as const,
          anchorSession: {
            kind: 'sep6_withdraw',
            domain: this.config.TR_ANCHOR_DOMAIN,
            transferId,
            quoteId: anchorQuoteId,
            sessionId,
            note: 'Fund anchor treasury payment with Memo.id; poll transfer status via BFF',
            withdraw: withdrawSession,
          },
          networkPassphrase: this.stellar.networkPassphrase,
          txHash,
        };
      }

      throw new ApiError('ROUTE_UNAVAILABLE', 'Unsupported route after earn unwind', 422);
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

    if (step === 'anchor_withdraw') {
      const result = await this.stellar.submitSignedXdr(signedXdr);
      await this.operations.update(operationId, {
        status: result.successful ? 'processing' : 'failed',
        externalRefs: { ...op.externalRefs, txHash: result.hash },
        metadata: {
          ...meta,
          completedSteps: [...(meta.completedSteps ?? []), 'anchor_withdraw'],
          currentStep: undefined,
          anchorFundingTxHash: result.hash,
        },
      });
      return {
        operationId,
        stepCompleted: 'anchor_withdraw',
        txHash: result.hash,
        successful: result.successful,
      };
    }

    throw new ApiError('VALIDATION_ERROR', 'Unsupported execution step', 400);
  }

  async buildEarnUnwindStep(
    operationId: string,
    quoteId: string,
    fromAccount: string,
    earnContribution: string,
    strategyId: string,
    routeType: PaymentRouteType,
  ) {
    const quote = this.quotes.get(quoteId);
    const payload = quote.providerPayload as {
      anchorSessionId?: string;
      anchorQuoteId?: string;
      soroswapQuote?: unknown;
    };
    const built = await this.yieldSvc.buildWithdraw({
      accountId: fromAccount,
      strategyId,
      amount: earnContribution,
      recordOperation: false,
    });
    await this.operations.update(operationId, {
      status: 'awaiting_signature',
      metadata: {
        quoteId,
        routeType,
        currentStep: 'yield_withdraw',
        completedSteps: [],
        earnContribution,
        earnStrategyId: strategyId,
        anchorSessionId: payload.anchorSessionId,
        anchorQuoteId: payload.anchorQuoteId,
        soroswapQuote: payload.soroswapQuote,
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
