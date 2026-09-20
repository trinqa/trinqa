import type { AnchorDirectory, IndicativePrice, IndicativePriceRequest } from '../domain/anchor.js';
import type { RouteAdvisor, RouteCandidate, RouteDecision, RouteRequest } from '../domain/route.js';
import { filterRoutes } from './route-filter.js';
import { decideRoute } from './route-scorer.js';

/** Bounds a best-effort SEP-38 indicative price lookup; a slow/unreachable anchor must
 * never hold up the whole preview. */
const INDICATIVE_PRICE_TIMEOUT_MS = 2000;

export interface RoutePlannerOptions {
  /** Stellar issuer for the USDC asset, used to build SEP-38 asset identifiers. */
  usdcIssuer: string;
  minConfidence?: number;
  timeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Orchestrates the three route-decision layers against the live anchor directory: list
 * anchors, deterministically filter them, best-effort enrich QUOTE_ONLY candidates with an
 * indicative SEP-38 price, then score and rank with the (optional) advisor.
 */
export class RoutePlanner {
  constructor(
    private readonly directory: AnchorDirectory,
    private readonly advisor: RouteAdvisor,
    private readonly opts: RoutePlannerOptions,
  ) {}

  async preview(request: RouteRequest): Promise<RouteDecision> {
    const anchors = await this.directory.list();
    const { candidates, rejected } = filterRoutes(request, anchors);

    const enriched = await Promise.all(candidates.map((candidate) => this.withIndicativePrice(candidate, request)));

    return decideRoute(request, enriched, rejected, this.advisor, {
      minConfidence: this.opts.minConfidence,
      timeoutMs: this.opts.timeoutMs,
    });
  }

  private async withIndicativePrice(candidate: RouteCandidate, request: RouteRequest): Promise<RouteCandidate> {
    if (candidate.status !== 'QUOTE_ONLY') return candidate;

    const adapter = this.directory.adapter(candidate.anchorId);
    if (!adapter?.indicativePrice) return candidate;

    const usdcAsset = `stellar:USDC:${this.opts.usdcIssuer}`;
    const fiatAsset = `iso4217:${request.fiatCurrency}`;
    const priceRequest: IndicativePriceRequest =
      request.direction === 'withdraw'
        ? { sellAsset: usdcAsset, buyAsset: fiatAsset, sellAmount: request.amount }
        : { sellAsset: fiatAsset, buyAsset: usdcAsset, sellAmount: request.amount };

    let price: IndicativePrice | null;
    try {
      price = await withTimeout(adapter.indicativePrice(priceRequest), INDICATIVE_PRICE_TIMEOUT_MS);
    } catch {
      price = null;
    }
    if (!price) return candidate;

    return { ...candidate, facts: { ...candidate.facts, indicativePrice: price } };
  }
}
