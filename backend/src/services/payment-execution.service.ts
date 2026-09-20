import type { AppConfig } from '../config/env.js';
import { ApiError } from '../domain/api-errors.js';
import type { Operation } from '../domain/operation.js';
import type { PaymentExecutionStep, PaymentRouteQuote, PaymentRouteType } from '../domain/payment.js';
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
import type { PushSender } from './push-sender.service.js';
import { paymentCompleted } from './notification-copy.js';
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
  withdrawDest?: string;
  withdrawDestExtra?: string;
  /** Hash of the unsigned XDR handed out for currentStep; the signed envelope must match it. */
  expectedTxHash?: string;
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
    private readonly pushSender?: PushSender,
  ) {}

  private assertSignedMatchesBuilt(expectedTxHash: string | undefined, signedXdr: string): void {
    if (!expectedTxHash) return;
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

  /** Metadata patch that pins the next step to the XDR we are about to hand out. */
  expectTx(unsignedXdr: string | undefined): { expectedTxHash?: string } {
    return { expectedTxHash: unsignedXdr ? this.stellar.transactionHash(unsignedXdr) : undefined };
  }

  /** USDC payment to the anchor treasury (Memo.id) that funds a SEP-6 withdraw. */
  async buildAnchorFunding(
    fromAccount: string,
    withdrawSession: unknown,
    amount: string,
  ): Promise<{ transferId: string; treasury: string; memo: string; unsignedXdr: string }> {
    const session = withdrawSession as { id?: string; account_id?: string; memo?: string; memo_type?: string };
    const { id: transferId, account_id: treasury, memo } = session;
    if (!transferId || !treasury || !memo) {
      throw new ApiError('ADAPTER_UNAVAILABLE', 'Anchor withdraw session missing treasury or memo', 502);
    }
    if (session.memo_type && session.memo_type !== 'id') {
      throw new ApiError('VALIDATION_ERROR', `Expected memo_type id, got ${session.memo_type}`, 502);
    }
    const unsignedXdr = await this.stellar.buildUsdcPaymentWithMemoIdXdr(fromAccount, treasury, amount, memo);
    return { transferId, treasury, memo, unsignedXdr };
  }

  private loadQuoteForExecution(quoteId: string) {
    return this.quotes.get(quoteId);
  }

  paymentDebitAmountForQuote(quote: PaymentRouteQuote): string {
    const funding = quote.funding;
    if (funding?.availableContribution && !funding.requiresEarnUnwind) {
      return funding.availableContribution;
    }
    return quote.debitAmount ?? quote.source.amount;
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
    const completed = meta.completedSteps ?? [];
    if (completed.includes(step)) {
      throw new ApiError('ALREADY_COMPLETED', `Step ${step} already completed`, 409);
    }
    if (op.status === 'completed' && step !== 'anchor_withdraw') {
      throw new ApiError('ALREADY_COMPLETED', 'Operation already completed', 409);
    }
    if (meta.currentStep !== step) {
      throw new ApiError(
        'INVALID_OPERATION_STATE',
        `Expected step ${meta.currentStep ?? 'unknown'}, got ${step}`,
        409,
      );
    }

    if (meta.quoteId) {
      this.quotes.get(meta.quoteId);
    }

    this.assertSignedMatchesBuilt(meta.expectedTxHash, signedXdr);

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
        withdrawDest?: string;
        withdrawDestExtra?: string;
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
            ...this.expectTx(unsignedXdr),
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
            ...this.expectTx(unsignedXdr),
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
        const withdrawDest = payload.withdrawDest ?? meta.withdrawDest;
        const withdrawDestExtra = payload.withdrawDestExtra ?? meta.withdrawDestExtra;
        if (!withdrawDest) {
          throw new ApiError('VALIDATION_ERROR', 'Missing SEP-6 withdraw destination on quote', 400);
        }
        const jwt = this.anchorSessions.resolve(sessionId, payload.fromAccount);
        const withdrawSession = await this.anchor.sep6Withdraw(jwt, {
          asset_code: 'USDC',
          account: payload.fromAccount,
          amount: quote.source.amount,
          dest: withdrawDest,
          dest_extra: withdrawDestExtra,
          quote_id: anchorQuoteId,
        });
        const { transferId, unsignedXdr } = await this.buildAnchorFunding(
          payload.fromAccount,
          withdrawSession,
          quote.source.amount,
        );
        await this.operations.update(operationId, {
          status: 'awaiting_signature',
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
            withdrawDest,
            withdrawDestExtra,
            ...this.expectTx(unsignedXdr),
          },
        });
        return {
          operationId,
          stepCompleted: 'yield_withdraw',
          nextStep: 'anchor_withdraw' as const,
          unsignedXdr,
          anchorSession: {
            kind: 'sep6_withdraw',
            domain: this.config.TR_ANCHOR_DOMAIN,
            transferId,
            quoteId: anchorQuoteId,
            sessionId,
            dest: withdrawDest,
            destExtra: withdrawDestExtra,
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
      this.notifyPaymentDone(op, result.successful);
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
      this.notifyPaymentDone(op, result.success);
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

  /**
   * The last step of a payment just landed. `op` is the pre-update snapshot, so this fires on
   * the transition only; a replayed step is rejected earlier as ALREADY_COMPLETED.
   * Fire-and-forget: `notify` never throws and the request never waits on it.
   */
  private notifyPaymentDone(op: Operation, successful: boolean): void {
    if (!this.pushSender || !successful || op.status === 'completed') return;
    void this.pushSender.notify(op.accountId, paymentCompleted(op));
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
      withdrawDest?: string;
      withdrawDestExtra?: string;
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
        withdrawDest: payload.withdrawDest,
        withdrawDestExtra: payload.withdrawDestExtra,
        ...this.expectTx(built.unsignedXdr),
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
    balanceSource?: 'available' | 'earn',
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
    const fmt = (d: InstanceType<typeof Decimal>) => d.toFixed(7);

    if (balanceSource === 'available') {
      if (req.gt(avail)) {
        throw new ApiError('INSUFFICIENT_BALANCE', 'Insufficient available USDC balance', 422, {
          available,
          earning,
          requested,
          balanceSource,
        });
      }
      return {
        availableContribution: fmt(req),
        earnContribution: fmt(new Decimal(0)),
        requiresEarnUnwind: false,
        totalBalance: fmt(total),
      };
    }

    if (balanceSource === 'earn') {
      if (req.gt(total)) {
        throw new ApiError('INSUFFICIENT_BALANCE', 'Insufficient total balance (available + earning)', 422, {
          available,
          earning,
          requested,
          balanceSource,
        });
      }
      const earnCont = Decimal.min(earn, req);
      const availCont = req.minus(earnCont);
      return {
        availableContribution: fmt(availCont),
        earnContribution: fmt(earnCont),
        requiresEarnUnwind: earnCont.gt(0),
        totalBalance: fmt(total),
      };
    }

    if (req.gt(total)) {
      throw new ApiError('INSUFFICIENT_BALANCE', 'Insufficient total balance (available + earning)', 422, {
        available,
        earning,
        requested,
      });
    }
    const availCont = Decimal.min(avail, req);
    const earnCont = req.minus(availCont);
    return {
      availableContribution: fmt(availCont),
      earnContribution: fmt(earnCont),
      requiresEarnUnwind: earnCont.gt(0),
      totalBalance: fmt(total),
    };
  }
}
