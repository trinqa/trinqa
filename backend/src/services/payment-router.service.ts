import type { AppConfig } from '../config/env.js';
import { ApiError } from '../domain/api-errors.js';
import type { PaymentQuoteRequest, PaymentRouteQuote } from '../domain/payment.js';
import { Decimal, formatTryAmount } from '../domain/money.js';
import type { TrMockAnchorAdapter } from '../adapters/tr-mock-anchor.adapter.js';
import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';
import type { StellarService } from './stellar.service.js';
import type { QuoteStore } from './quote-store.service.js';
import type { OperationStore } from './operation-store.js';
import { recordOperation } from './operation-store.js';
import { scoreRoute, type RouteCandidate } from './deterministic-risk-engine.js';
import type { CapabilityService } from './capability.service.js';

export class PaymentRouter {
  constructor(
    private readonly config: AppConfig,
    private readonly stellar: StellarService,
    private readonly anchor: TrMockAnchorAdapter,
    private readonly soroswap: SoroswapAdapter,
    private readonly capabilities: CapabilityService,
    private readonly quotes: QuoteStore,
    private readonly operations: OperationStore,
  ) {}

  async quote(req: PaymentQuoteRequest): Promise<PaymentRouteQuote> {
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

    if (req.balanceSource === 'earn') {
      throw new ApiError('EARN_UNWIND_REQUIRED', 'Earn balance requires explicit unwind before pay', 409, {
        requiresPolicyAuthorization: true,
        suggestedActions: [
          { type: 'policy', action: 'authorize_allocation' },
          { type: 'yield', action: 'build_withdraw' },
        ],
      });
    }

    const balances = await this.stellar.getBalances(req.fromAccount).catch(() => []);
    const usdcLine = balances.find(
      (b) => b.assetCode === req.sourceAssetCode && b.assetIssuer === this.config.USDC_ISSUER,
    );
    const available = new Decimal(usdcLine?.balance ?? '0');
    if (available.lt(req.sourceAmount)) {
      throw new ApiError('INSUFFICIENT_BALANCE', 'Insufficient available balance', 422, {
        available: usdcLine?.balance ?? '0',
        requested: req.sourceAmount,
      });
    }

    const candidates: RouteCandidate[] = [];

    if (dest === 'USDC' || dest === 'XLM') {
      candidates.push({
        routeType: 'stellar_transfer',
        estimatedMinutes: 2,
        feeBps: 0,
        supported: true,
      });
    }

    if (dest === 'TRY') {
      candidates.push({
        routeType: 'fiat_payout',
        estimatedMinutes: 30,
        feeBps: 50,
        supported: true,
      });
    }

    if (dest !== req.sourceAssetCode && this.soroswap.isConfigured) {
      candidates.push({
        routeType: 'stellar_swap_transfer',
        estimatedMinutes: 5,
        feeBps: 30,
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
    if (chosen.routeType === 'fiat_payout' && dest === 'TRY') {
      destinationAmount = formatTryAmount(
        new Decimal(req.sourceAmount).mul(34).toString(),
      );
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const routeScore = ranked[0]?.score;

    const stored = this.quotes.save({
      routeType: chosen.routeType,
      candidateCount: ranked.length,
      routeScore,
      source: { assetCode: req.sourceAssetCode, amount: req.sourceAmount },
      destination: { currency: dest, amount: destinationAmount },
      fee: { assetCode: req.sourceAssetCode, amount: '0.0000000' },
      estimatedArrivalMinutes: chosen.estimatedMinutes,
      expiresAt,
      providerPayload: {
        fromAccount: req.fromAccount,
        recipient: req.recipient,
        routeScore,
        candidateCount: ranked.length,
      },
    });

    return stored;
  }

  async build(quoteId: string, fromAccount: string) {
    const quote = this.quotes.get(quoteId);
    const payload = quote.providerPayload as { fromAccount: string; recipient: string };
    if (payload.fromAccount !== fromAccount) {
      throw new ApiError('VALIDATION_ERROR', 'fromAccount mismatch', 400);
    }

    const op = await recordOperation(this.operations, {
      kind: 'payment',
      status: 'processing',
      accountId: fromAccount,
      title: `Pay ${quote.destination.amount} ${quote.destination.currency}`,
      amount: { assetCode: quote.source.assetCode, amount: quote.source.amount },
      externalRefs: { quoteId },
      metadata: { routeType: quote.routeType },
    });

    if (quote.routeType === 'stellar_transfer') {
      const amount = quote.source.amount;
      const unsignedXdr = await this.stellar.buildPaymentXdr(
        fromAccount,
        payload.recipient,
        amount,
      );
      return {
        operationId: op.id,
        unsignedXdr,
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
          note: 'Client must complete SEP-10 + SEP-6 withdraw with user JWT',
        },
        steps: [
          { type: 'sep10', description: 'Authenticate with TR mock anchor' },
          { type: 'sep6_withdraw', description: 'Start interactive withdraw to TRY' },
        ],
      };
    }

    if (quote.routeType === 'stellar_swap_transfer') {
      if (!this.soroswap.isConfigured) {
        throw new ApiError('ADAPTER_UNAVAILABLE', 'Soroswap not configured', 503);
      }
      throw new ApiError(
        'ROUTE_UNAVAILABLE',
        'Swap-transfer build requires asset contract mapping — use /api/v1/swaps/build',
        501,
        { quoteId },
      );
    }

    throw new ApiError('ROUTE_UNAVAILABLE', 'Unsupported route build', 422);
  }

  async quoteWithdrawToTry(fromAccount: string, usdcAmount: string): Promise<PaymentRouteQuote> {
    return this.quote({
      fromAccount,
      recipient: fromAccount,
      sourceAmount: usdcAmount,
      sourceAssetCode: 'USDC',
      destinationCurrency: 'TRY',
      balanceSource: 'available',
    });
  }
}
