import type { DecimalString } from './money.js';
import type { AnchorAssetRail, AnchorStatus, IndicativePrice, RailDirection } from './anchor.js';

/**
 * Route decision contract (Phase 2).
 *
 * Three layers, in order:
 *   1. Deterministic filter  — drops routes that cannot serve the request, with reasons.
 *   2. Advisor (Jev)         — optional judgment on eligible routes; never signs or executes.
 *   3. Deterministic scoring — our weights decide; advisor input is used only above a
 *                              confidence threshold and only for judgment factors.
 */

export type KycStatus = 'ACCEPTED' | 'NEEDS_INFO' | 'PROCESSING' | 'REJECTED' | 'UNKNOWN';

export interface RouteRequest {
  direction: RailDirection;
  /** ISO 4217 code of the fiat side, e.g. "TRY". */
  fiatCurrency: string;
  /** Stellar asset on the crypto side; the BFF only settles USDC today. */
  assetCode: 'USDC';
  /** Amount in asset units (USDC), which is what anchor limits are expressed in. */
  amount: DecimalString;
  kycStatus?: KycStatus;
  /** When true, anything that is not EXECUTABLE is rejected with NOT_EXECUTABLE. */
  requireExecutable?: boolean;
  user?: { riskProfile: 0 | 1 | 2; daysToTarget: number };
}

export type RouteRejectReason =
  | 'CURRENCY_UNSUPPORTED'
  | 'DIRECTION_UNSUPPORTED'
  | 'BELOW_MIN'
  | 'ABOVE_MAX'
  | 'SEP_MISSING'
  | 'UNAVAILABLE'
  | 'KYC_REQUIRED'
  | 'NOT_EXECUTABLE';

/** Facts measured or published by the anchor. Numbers the advisor must never compute. */
export interface RouteFacts {
  feePercent?: number;
  feeFixed?: number;
  /** Published or configured settlement time; undefined when unknown. */
  estimatedMinutes?: number;
  /** 0-100, derived from health and metadata freshness. */
  reliability: number;
  indicativePrice?: IndicativePrice | null;
}

export interface RouteCandidate {
  /** `${anchorId}:${direction}:${assetCode}:${fiatCurrency}` */
  routeId: string;
  anchorId: string;
  anchorDomain: string;
  anchorName: string;
  status: AnchorStatus;
  rail: AnchorAssetRail;
  facts: RouteFacts;
}

export interface RejectedRoute {
  anchorId: string;
  anchorDomain: string;
  anchorName: string;
  status: AnchorStatus;
  reasons: RouteRejectReason[];
  detail?: string;
}

export type RouteFactorKey =
  | 'netCost'
  | 'speed'
  | 'reliability'
  | 'liquidity'
  | 'horizonFit'
  | 'riskFit'
  | 'yieldImpact';

/** Every factor is scored 0-100, higher is better. */
export type RouteFactors = Record<RouteFactorKey, number>;

/** Weights sum to 100. Owned by Trinqa, never by the advisor. */
export const ROUTE_FACTOR_WEIGHTS: Readonly<RouteFactors> = {
  netCost: 35,
  speed: 15,
  reliability: 15,
  liquidity: 10,
  horizonFit: 10,
  riskFit: 10,
  yieldImpact: 5,
};

/**
 * Factors an advisor may influence. Cost and speed are arithmetic on published numbers,
 * which language models get wrong, so they are always computed deterministically.
 */
export const ADVISOR_FACTORS: readonly RouteFactorKey[] = [
  'reliability',
  'liquidity',
  'horizonFit',
  'riskFit',
  'yieldImpact',
];

export const DEFAULT_ADVISOR_MIN_CONFIDENCE = 0.6;

export interface AdvisorInput {
  request: RouteRequest;
  routes: RouteCandidate[];
}

export interface RouteAdvice {
  routeId: string;
  /** Only ADVISOR_FACTORS are honored; anything else is ignored. */
  factors: Partial<RouteFactors>;
  /** 0-1. */
  confidence: number;
  rationale?: string;
}

export interface RouteAdvisor {
  readonly name: 'jev' | 'none';
  /** Must resolve (never reject) within its own timeout; failures resolve to []. */
  advise(input: AdvisorInput): Promise<RouteAdvice[]>;
}

export type AdvisorFallbackReason = 'disabled' | 'timeout' | 'error' | 'low_confidence' | 'invalid_output' | 'no_routes';

export interface ScoredRoute {
  routeId: string;
  anchorId: string;
  anchorName: string;
  status: AnchorStatus;
  score: number;
  factors: RouteFactors;
  factorSources: Record<RouteFactorKey, 'deterministic' | 'advisor'>;
  advisorRationale?: string;
}

export interface RouteDecision {
  request: RouteRequest;
  eligible: ScoredRoute[];
  rejected: RejectedRoute[];
  /** Highest score among eligible routes, or null. */
  chosen: ScoredRoute | null;
  /** True when `chosen` is EXECUTABLE, i.e. the BFF can actually move the money. */
  executable: boolean;
  advisor: {
    name: 'jev' | 'none';
    used: boolean;
    minConfidence: number;
    fallbackReason?: AdvisorFallbackReason;
  };
  decidedAt: string;
}
