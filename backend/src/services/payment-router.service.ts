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
    const balances = await this.stellar.getBalances(fromAccount).catch(() => []);
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

  private async trySep38TryQuote(
    anchorSessionId: string,
    fromAccount: string,
    usdcAmount: string,
  ): Promise<{ buyAmount: string; quoteId: string; expiresAt: string; price: string }> {
    const jwt = this.anchorSessions.resolve(anchorSessionId, fromAccount);
    const sellAsset = `stellar:USDC:${this.config.USDC_ISSUER}`;
    const buyAsset = 'iso4217:TRY';
    const quote = await this.anchor.sep38Quote(jwt, {
      sellAsset,
      buyAsset,
      sellAmount: usdcAmount,
    });
    return {
      buyAmount: quote.buy_amount,
      quoteId: quote.id,
      expiresAt: quote.expires_at,
      price: quote.price,
    };
  }

  async quote(req: PaymentQuoteRequest): Promise<PaymentRouteQuote> {
    if (req.sourceAssetCode !== 'USDC') {
      throw new ApiError('VALIDATION_ERROR', 'Only USDC is supported as payment source in this MVP', 400);
    }

    const dest = req.destinationCurrency.toUpperCase();
    const rail = this.capabilities.payoutRailFor(dest);
    if (!rail.available) {
      throw new ApiError(
        rail.reason === 'NO_SUPPORTED_PAYOUT_RAIL' ? 'NO_SUPPORTED_PAYOUT_RAIL' : 'ROUTE_UNAVAILABLE',
        `No payout rail for ${dest}`,
        422,
        { currency: dest },
      );
    }

    const { available, earning } = await this.resolveBalances(req.fromAccount);
    const fundingCalc = this.execution.computeFunding(available, earning, req.sourceAmount);

    const swapViable =
      this.soroswap.isConfigured &&
      dest === 'XLM' &&
      (await this.assetRegistry.canSwap('USDC', 'XLM', this.config.USDC_ISSUER));

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

    let destinationAmount = req.sourceAmount;
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

    if (chosen.routeType === 'fiat_payout' && dest === 'TRY') {
      if (!req.anchorSessionId) {
        throw new ApiError('VALIDATION_ERROR', 'anchorSessionId required for TRY cash-out quote', 400);
      }
      if (req.recipient !== req.fromAccount) {
        throw new ApiError(
          'VALIDATION_ERROR',
          'TRY cash-out is withdraw to your linked bank account, not arbitrary P2P TRY pay',
          400,
        );
      }
      const sep38 = await this.trySep38TryQuote(req.anchorSessionId, req.fromAccount, req.sourceAmount);
      destinationAmount = formatTryAmount(sep38.buyAmount);
      expiresAt = sep38.expiresAt;
      providerPayload.anchorSessionId = req.anchorSessionId;
      providerPayload.anchorQuoteId = sep38.quoteId;
      providerPayload.anchorQuoteExpiresAt = sep38.expiresAt;
      providerPayload.anchorPrice = sep38.price;
    }

    if (chosen.routeType === 'stellar_swap_transfer' && dest === 'XLM') {
      const usdcContract = await this.assetRegistry.resolveClassicAsset('USDC', this.config.USDC_ISSUER);
      const xlmContract = await this.assetRegistry.resolveClassicAsset('XLM');
      if (!usdcContract || !xlmContract) {
        throw new ApiError('ASSET_ROUTE_UNAVAILABLE', 'Cannot resolve Soroswap asset contracts', 422);
      }
      const amountIn = toAtomic(req.sourceAmount, 7);
      const preview = await this.soroswap.quoteExactIn({
        assetIn: usdcContract,
        assetOut: xlmContract,
        amountIn,
      });
      const amountOut = preview.amountOut;
      const swapQuote = await this.soroswap.quoteExactOut({
        assetIn: usdcContract,
        assetOut: xlmContract,
        amountOut,
      });
      destinationAmount = formatStellarAmount(fromAtomic(amountOut, 7));
      providerPayload.soroswapQuote = swapQuote;
      providerPayload.swapAmountOut = destinationAmount;
    }

    const stored = this.quotes.save({
      routeType: chosen.routeType,
      candidateCount: ranked.length,
      routeScore: ranked[0]?.score,
      source: { assetCode: req.sourceAssetCode, amount: req.sourceAmount },
      destination: { currency: dest, amount: destinationAmount },
      fee: { assetCode: req.sourceAssetCode, amount: '0.0000000' },
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
      const amount = quote.source.amount;
      const unsignedXdr = await this.stellar.buildPaymentXdr(fromAccount, payload.recipient, amount);
      await this.operations.update(op.id, {
        status: 'awaiting_signature',
        metadata: { routeType: quote.routeType, currentStep: 'stellar_payment', quoteId },
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
      return {
        operationId: op.id,
        networkPassphrase: this.stellar.networkPassphrase,
        anchorSession: {
          kind: 'sep6_withdraw',
          domain: this.config.TR_ANCHOR_DOMAIN,
          assetCode: 'USDC',
          amount: quote.source.amount,
          destinationCurrency: quote.destination.currency,
          quoteId: payload.anchorQuoteId,
          note: 'Complete SEP-6 withdraw with sessionId; pass quoteId to lock SEP-38 rate',
        },
        steps: [
          { type: 'sep10', description: 'Authenticate with TR mock anchor (opaque sessionId)' },
          { type: 'sep6_withdraw', description: 'Start interactive withdraw to TRY' },
        ],
      };
    }

    if (quote.routeType === 'stellar_swap_transfer') {
      if (!this.soroswap.isConfigured) {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'Soroswap not configured', 503);
      }
      const payloadSwap = payload.soroswapQuote;
      let swapQuote = payloadSwap;
      if (!swapQuote) {
        const usdcContract = await this.assetRegistry.resolveClassicAsset('USDC', this.config.USDC_ISSUER);
        const xlmContract = await this.assetRegistry.resolveClassicAsset('XLM');
        if (!usdcContract || !xlmContract) {
          throw new ApiError('ASSET_ROUTE_UNAVAILABLE', 'Cannot resolve Soroswap asset contracts', 422);
        }
        const amountOut = toAtomic(quote.destination.amount, 7);
        swapQuote = await this.soroswap.quoteExactOut({
          assetIn: usdcContract,
          assetOut: xlmContract,
          amountOut,
        });
      }
      const built = await this.soroswap.buildFromQuote(
        swapQuote as never,
        fromAccount,
        payload.recipient,
      );
      await this.operations.update(op.id, {
        status: 'awaiting_signature',
        metadata: {
          routeType: quote.routeType,
          currentStep: 'soroswap_swap',
          quoteId,
          soroswapQuote: swapQuote,
        },
      });
      return {
        operationId: op.id,
        unsignedXdr: (built as { xdr?: string }).xdr ?? (built as { transactionXdr?: string }).transactionXdr,
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
  ): Promise<PaymentRouteQuote> {
    return this.quote({
      fromAccount,
      recipient: fromAccount,
      sourceAmount: usdcAmount,
      sourceAssetCode: 'USDC',
      destinationCurrency: 'TRY',
      anchorSessionId,
    });
  }
}
