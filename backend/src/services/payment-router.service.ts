import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/env.js';
import { ApiError } from '../domain/api-errors.js';
import type { PaymentQuoteRequest, PaymentRouteQuote } from '../domain/payment.js';
import { Decimal, formatStellarAmount, formatTryAmount, fromAtomic } from '../domain/money.js';
import type { TrMockAnchorAdapter } from '../adapters/tr-mock-anchor.adapter.js';
import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';
import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import type { StellarService } from './stellar.service.js';
import type { QuoteStore } from './quote-store.service.js';
import type { OperationStore } from './operation-store.js';
import { recordOperation } from './operation-store.js';
import { scoreRoute, type RouteCandidate } from './deterministic-risk-engine.js';
import type { CapabilityService } from './capability.service.js';
import type { AnchorSessionStore } from './anchor-session-store.service.js';
import { SoroswapAssetRegistry } from './soroswap-asset-registry.js';
import type { PaymentExecutionService } from './payment-execution.service.js';
import { toAtomic } from '../domain/money.js';

export class PaymentRouter {
  private readonly assetRegistry: SoroswapAssetRegistry;

  constructor(
    private readonly config: AppConfig,
    private readonly stellar: StellarService,
    private readonly anchor: TrMockAnchorAdapter,
    private readonly soroswap: SoroswapAdapter,
    private readonly defindex: DefindexYieldAdapter,
    private readonly capabilities: CapabilityService,
    private readonly quotes: QuoteStore,
    private readonly operations: OperationStore,
    private readonly anchorSessions: AnchorSessionStore,
    private readonly execution: PaymentExecutionService,
  ) {
    this.assetRegistry = new SoroswapAssetRegistry(soroswap);
  }

  private async resolveBalances(fromAccount: string) {
    const balances = await this.stellar.getBalances(fromAccount).catch((err: unknown) => {
      // An account Horizon has never seen genuinely holds nothing; any other failure must not
      // masquerade as "insufficient balance".
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) return [];
      throw new ApiError('ADAPTER_UNAVAILABLE', 'Unable to read Stellar balances', 503);
    });
    const usdcLine = balances.find(
      (b) => b.assetCode === 'USDC' && b.assetIssuer === this.config.USDC_ISSUER,
    );
    const available = usdcLine?.balance ?? '0';
    let earning = '0';
    if (this.defindex.isConfigured) {
      try {
        const vault = this.defindex.requireVault();
        const pos = await this.defindex.normalizePosition(
          fromAccount,
          `defindex:${vault}`,
        );
        earning = pos?.positionValue.amount ?? '0';
      } catch {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'Unable to read DeFindex earning balance', 503);
      }
    }
    return { available, earning };
  }

  /** SEP-38 USDC→TRY firm quote, by exact USDC sold or exact TRY received. */
  private async sep38UsdcToTry(
    anchorSessionId: string,
    fromAccount: string,
    amount: { sellAmount: string } | { buyAmount: string },
  ): Promise<{
    buyAmount: string;
    sellAmount: string;
    quoteId: string;
    expiresAt: string;
    price: string;
    feeUsdc?: string;
  }> {
    const jwt = this.anchorSessions.resolve(anchorSessionId, fromAccount);
    const sellAsset = `stellar:USDC:${this.config.USDC_ISSUER}`;
    const quote = await this.anchor.sep38Quote(jwt, { sellAsset, buyAsset: 'iso4217:TRY', ...amount });
    return {
      buyAmount: quote.buy_amount,
      sellAmount: quote.sell_amount,
      quoteId: quote.id,
      expiresAt: quote.expires_at,
      price: quote.price,
      // SEP-38 fee is already inside the price; surface it so the UI does not claim "no fee".
      feeUsdc: quote.fee?.asset === sellAsset ? quote.fee.total : undefined,
    };
  }

  private async assertWithinWithdrawLimits(usdcAmount: string): Promise<void> {
    const { min, max } = await this.anchor.withdrawLimits('USDC');
    const amount = new Decimal(usdcAmount);
    if ((min && amount.lt(min)) || (max && amount.gt(max))) {
      throw new ApiError('AMOUNT_OUT_OF_RANGE', `Cash-out must be between ${min ?? '0'} and ${max ?? '∞'} USDC`, 422, {
        min,
        max,
        assetCode: 'USDC',
        requested: usdcAmount,
      });
    }
  }

  async quote(req: PaymentQuoteRequest): Promise<PaymentRouteQuote> {
    const dest = req.receiveCurrency.toUpperCase();
    const receiveAmount = req.receiveAmount;
    const rail = this.capabilities.payoutRailFor(dest);
    if (!rail.available) {
      throw new ApiError(
        rail.reason === 'NO_SUPPORTED_PAYOUT_RAIL' ? 'NO_SUPPORTED_PAYOUT_RAIL' : 'ROUTE_UNAVAILABLE',
        `No payout rail for ${dest}`,
        422,
        { currency: dest },
      );
    }

    let xlmSwapQuote: Awaited<ReturnType<SoroswapAdapter['quoteExactOut']>> | null = null;
    let debitUsdc = dest === 'USDC' ? formatStellarAmount(receiveAmount) : '0.0000000';

    if (dest === 'XLM') {
      if (!this.soroswap.isConfigured) {
        throw new ApiError('ROUTE_UNAVAILABLE', 'XLM payout requires Soroswap', 422);
      }
      try {
        const canSwap = await this.assetRegistry.canSwap('USDC', 'XLM', this.config.USDC_ISSUER);
        const usdcContract = canSwap
          ? await this.assetRegistry.resolveClassicAsset('USDC', this.config.USDC_ISSUER)
          : null;
        const xlmContract = canSwap ? await this.assetRegistry.resolveClassicAsset('XLM') : null;
        if (usdcContract && xlmContract) {
          const amountOut = toAtomic(receiveAmount, 7);
          xlmSwapQuote = await this.soroswap.quoteExactOut({
            assetIn: usdcContract,
            assetOut: xlmContract,
            amountOut,
          });
          debitUsdc = formatStellarAmount(fromAtomic(xlmSwapQuote.amountIn, 7));
        }
      } catch {
        xlmSwapQuote = null;
      }
      if (!xlmSwapQuote) {
        throw new ApiError('ROUTE_UNAVAILABLE', 'Cannot quote XLM exact-out route', 422);
      }
    }

    let trySep38: Awaited<ReturnType<PaymentRouter['sep38UsdcToTry']>> | null = null;
    if (dest === 'TRY') {
      if (!req.anchorSessionId) {
        throw new ApiError('VALIDATION_ERROR', 'anchorSessionId required for TRY cash-out quote', 400);
      }
      if (!req.withdrawDest?.trim()) {
        throw new ApiError('VALIDATION_ERROR', 'withdrawDest required for TRY cash-out quote', 400);
      }
      if (req.recipient !== req.fromAccount) {
        throw new ApiError(
          'VALIDATION_ERROR',
          'TRY cash-out is withdraw to your linked bank account, not arbitrary P2P TRY pay',
          400,
        );
      }
      trySep38 = await this.sep38UsdcToTry(
        req.anchorSessionId,
        req.fromAccount,
        req.sendAmount
          ? { sellAmount: formatStellarAmount(req.sendAmount) }
          : { buyAmount: formatTryAmount(receiveAmount) },
      );
      debitUsdc = formatStellarAmount(trySep38.sellAmount);
      await this.assertWithinWithdrawLimits(debitUsdc);
    }

    const { available, earning } = await this.resolveBalances(req.fromAccount);
    const fundingCalc = this.execution.computeFunding(
      available,
      earning,
      debitUsdc,
      req.balanceSource,
    );

    const swapViable = Boolean(xlmSwapQuote);

    const candidates: RouteCandidate[] = [];

    if (dest === 'USDC') {
      candidates.push({
        routeType: 'stellar_transfer',
        estimatedMinutes: 2,
        feeBps: 0,
        netPayoutScore: 95,
        reliabilityScore: 95,
        kycFrictionScore: 100,
        limitsScore: 90,
        supported: true,
      });
    }

    if (dest === 'TRY') {
      candidates.push({
        routeType: 'fiat_payout',
        estimatedMinutes: 30,
        feeBps: 50,
        netPayoutScore: 85,
        reliabilityScore: 90,
        kycFrictionScore: 70,
        limitsScore: 80,
        supported: true,
      });
    }

    if (swapViable) {
      candidates.push({
        routeType: 'stellar_swap_transfer',
        estimatedMinutes: 5,
        feeBps: 30,
        netPayoutScore: 80,
        reliabilityScore: 85,
        kycFrictionScore: 100,
        limitsScore: 75,
        supported: true,
      });
    }

    const ranked = candidates
      .map((c) => ({ c, score: scoreRoute(c) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    const chosen = ranked[0]?.c;
    if (!chosen) {
      throw new ApiError('ROUTE_UNAVAILABLE', 'No route candidates', 422);
    }

    let destinationAmount =
      dest === 'TRY' ? formatTryAmount(receiveAmount) : formatStellarAmount(receiveAmount);
    let expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const providerPayload: Record<string, unknown> = {
      fromAccount: req.fromAccount,
      recipient: req.recipient,
      routeScore: ranked[0]?.score,
      candidateCount: ranked.length,
      funding: {
        availableBalance: formatStellarAmount(available),
        earningBalance: formatStellarAmount(earning),
        totalBalance: fundingCalc.totalBalance,
        availableContribution: fundingCalc.availableContribution,
        earnContribution: fundingCalc.earnContribution,
        requiresEarnUnwind: fundingCalc.requiresEarnUnwind,
      },
    };

    if (chosen.routeType === 'fiat_payout' && dest === 'TRY' && trySep38) {
      destinationAmount = formatTryAmount(trySep38.buyAmount);
      expiresAt = trySep38.expiresAt;
      providerPayload.anchorSessionId = req.anchorSessionId;
      providerPayload.anchorQuoteId = trySep38.quoteId;
      providerPayload.anchorQuoteExpiresAt = trySep38.expiresAt;
      providerPayload.anchorPrice = trySep38.price;
      providerPayload.withdrawDest = req.withdrawDest!.trim();
      if (req.withdrawDestExtra?.trim()) {
        providerPayload.withdrawDestExtra = req.withdrawDestExtra.trim();
      }
    }

    if (chosen.routeType === 'stellar_swap_transfer' && dest === 'XLM' && xlmSwapQuote) {
      destinationAmount = formatStellarAmount(receiveAmount);
      providerPayload.soroswapQuote = xlmSwapQuote;
      providerPayload.swapAmountOut = destinationAmount;
    }

    const stored = this.quotes.save({
      routeType: chosen.routeType,
      candidateCount: ranked.length,
      routeScore: ranked[0]?.score,
      source: { assetCode: 'USDC', amount: debitUsdc },
      destination: { currency: dest, amount: destinationAmount },
      receiveAmount: destinationAmount,
      receiveCurrency: dest,
      debitAmount: debitUsdc,
      debitAsset: 'USDC',
      fee: { assetCode: 'USDC', amount: formatStellarAmount(trySep38?.feeUsdc ?? '0') },
      estimatedArrivalMinutes: chosen.estimatedMinutes,
      expiresAt,
      funding: providerPayload.funding as PaymentRouteQuote['funding'],
      providerPayload,
    });

    return stored;
  }

  async build(quoteId: string, fromAccount: string, approveEarnUnwind?: boolean) {
    const quote = this.quotes.get(quoteId);
    const payload = quote.providerPayload as {
      fromAccount: string;
      recipient: string;
      funding?: { requiresEarnUnwind?: boolean; earnContribution?: string };
      anchorQuoteId?: string;
      soroswapQuote?: unknown;
    };
    if (payload.fromAccount !== fromAccount) {
      throw new ApiError('VALIDATION_ERROR', 'fromAccount mismatch', 400);
    }

    const requiresUnwind = quote.funding?.requiresEarnUnwind ?? payload.funding?.requiresEarnUnwind;
    if (requiresUnwind && approveEarnUnwind !== true) {
      throw new ApiError('EARN_UNWIND_APPROVAL_REQUIRED', 'Explicit earn unwind approval required', 409, {
        earnContribution: quote.funding?.earnContribution,
      });
    }
    // Claim synchronously (before any await) so concurrent builds cannot both fund from one quote.
    this.quotes.claim(quoteId, randomUUID());

    const op = await recordOperation(this.operations, {
      kind: 'payment',
      status: requiresUnwind ? 'created' : 'awaiting_signature',
      accountId: fromAccount,
      title: `Pay ${quote.destination.amount} ${quote.destination.currency}`,
      amount: { assetCode: quote.source.assetCode, amount: quote.source.amount },
      externalRefs: { quoteId },
      metadata: {
        routeType: quote.routeType,
        funding: quote.funding,
        anchorQuoteId: payload.anchorQuoteId,
      },
    });

    if (requiresUnwind) {
      const earnAmount = quote.funding?.earnContribution ?? payload.funding?.earnContribution;
      if (!earnAmount) {
        throw new ApiError('VALIDATION_ERROR', 'Missing earn contribution on quote', 500);
      }
      const strategyId = this.execution.resolveEarnStrategyId();
      const step = await this.execution.buildEarnUnwindStep(
        op.id,
        quoteId,
        fromAccount,
        earnAmount,
        strategyId,
        quote.routeType,
      );
      const tailStep =
        quote.routeType === 'stellar_swap_transfer'
          ? { type: 'soroswap_swap', description: 'Sign Soroswap swap to recipient' }
          : quote.routeType === 'fiat_payout'
            ? { type: 'anchor_withdraw', description: 'Complete SEP-6 withdraw to TRY' }
            : { type: 'stellar_payment', description: 'Sign final Stellar USDC payment' };
      return {
        operationId: op.id,
        unsignedXdr: step.unsignedXdr,
        currentStep: step.currentStep,
        networkPassphrase: this.stellar.networkPassphrase,
        steps: [
          { type: 'yield_withdraw', description: 'Sign DeFindex partial withdraw' },
          tailStep,
        ],
      };
    }

    if (quote.routeType === 'stellar_transfer') {
      const amount = this.execution.paymentDebitAmountForQuote(quote);
      const unsignedXdr = await this.stellar.buildPaymentXdr(fromAccount, payload.recipient, amount);
      await this.operations.update(op.id, {
        status: 'awaiting_signature',
        metadata: {
          routeType: quote.routeType,
          currentStep: 'stellar_payment',
          quoteId,
          ...this.execution.expectTx(unsignedXdr),
        },
      });
      return {
        operationId: op.id,
        unsignedXdr,
        currentStep: 'stellar_payment',
        networkPassphrase: this.stellar.networkPassphrase,
        steps: [{ type: 'stellar_payment', description: 'Sign and submit Stellar payment' }],
      };
    }

    if (quote.routeType === 'fiat_payout') {
      const withdrawPayload = quote.providerPayload as {
        withdrawDest?: string;
        withdrawDestExtra?: string;
        anchorQuoteId?: string;
        anchorSessionId?: string;
      };
      if (!withdrawPayload.withdrawDest) {
        throw new ApiError('VALIDATION_ERROR', 'Missing withdrawDest on TRY quote', 400);
      }
      const sessionId = withdrawPayload.anchorSessionId;
      if (!sessionId) {
        throw new ApiError('VALIDATION_ERROR', 'Missing anchor session for TRY withdraw', 400);
      }
      let jwt: string;
      try {
        jwt = this.anchorSessions.resolve(sessionId, fromAccount);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ANCHOR_SESSION_INVALID';
        if (msg === 'ANCHOR_SESSION_NOT_FOUND' || msg === 'ANCHOR_SESSION_EXPIRED') {
          throw new ApiError('ANCHOR_SESSION_INVALID', 'Anchor session expired or unknown', 401);
        }
        if (msg === 'ANCHOR_SESSION_ACCOUNT_MISMATCH') {
          throw new ApiError('VALIDATION_ERROR', 'Anchor session account mismatch', 400);
        }
        throw err;
      }
      const withdrawSession = await this.anchor.sep6Withdraw(jwt, {
        asset_code: 'USDC',
        account: fromAccount,
        amount: quote.source.amount,
        dest: withdrawPayload.withdrawDest,
        dest_extra: withdrawPayload.withdrawDestExtra,
        quote_id: withdrawPayload.anchorQuoteId,
      });
      const { transferId, memo, unsignedXdr } = await this.execution.buildAnchorFunding(
        fromAccount,
        withdrawSession,
        quote.source.amount,
      );
      await this.operations.update(op.id, {
        status: 'awaiting_signature',
        externalRefs: {
          quoteId,
          anchorTransferId: transferId,
        },
        metadata: {
          routeType: quote.routeType,
          currentStep: 'anchor_withdraw',
          quoteId,
          anchorSessionId: sessionId,
          withdrawDest: withdrawPayload.withdrawDest,
          withdrawDestExtra: withdrawPayload.withdrawDestExtra,
          anchorQuoteId: withdrawPayload.anchorQuoteId,
          ...this.execution.expectTx(unsignedXdr),
        },
      });
      return {
        operationId: op.id,
        unsignedXdr,
        currentStep: 'anchor_withdraw',
        networkPassphrase: this.stellar.networkPassphrase,
        anchorSession: {
          kind: 'sep6_withdraw',
          domain: this.config.TR_ANCHOR_DOMAIN,
          transferId,
          dest: withdrawPayload.withdrawDest,
          destExtra: withdrawPayload.withdrawDestExtra,
          quoteId: withdrawPayload.anchorQuoteId,
          memo,
          note: 'Sign the USDC funding payment; poll transfer status via BFF',
        },
        steps: [{ type: 'anchor_withdraw', description: 'Sign USDC funding payment to TR mock anchor' }],
      };
    }

    if (quote.routeType === 'stellar_swap_transfer') {
      if (!this.soroswap.isConfigured) {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'Soroswap not configured', 503);
      }
      const swapQuote = payload.soroswapQuote;
      if (!swapQuote) {
        throw new ApiError('QUOTE_EXPIRED', 'Missing Soroswap quote; request a fresh payment quote', 410);
      }
      const built = await this.soroswap.buildFromQuote(
        swapQuote as never,
        fromAccount,
        payload.recipient,
      );
      const unsignedXdr =
        (built as { xdr?: string }).xdr ?? (built as { transactionXdr?: string }).transactionXdr;
      await this.operations.update(op.id, {
        status: 'awaiting_signature',
        metadata: {
          routeType: quote.routeType,
          currentStep: 'soroswap_swap',
          quoteId,
          soroswapQuote: swapQuote,
          ...this.execution.expectTx(unsignedXdr),
        },
      });
      return {
        operationId: op.id,
        unsignedXdr,
        currentStep: 'soroswap_swap',
        networkPassphrase: this.stellar.networkPassphrase,
        steps: [{ type: 'soroswap_swap', description: 'Sign Soroswap swap transaction' }],
      };
    }

    throw new ApiError('ROUTE_UNAVAILABLE', 'Unsupported route build', 422);
  }

  async quoteWithdrawToTry(
    fromAccount: string,
    usdcAmount: string,
    anchorSessionId: string,
    withdrawDest: string,
    withdrawDestExtra?: string,
  ): Promise<PaymentRouteQuote> {
    return this.quote({
      fromAccount,
      recipient: fromAccount,
      receiveAmount: '0',
      receiveCurrency: 'TRY',
      sendAmount: usdcAmount,
      anchorSessionId,
      withdrawDest,
      withdrawDestExtra,
    });
  }
}
