import { Decimal } from '../domain/money.js';
import {
  ADVISOR_FACTORS,
  DEFAULT_ADVISOR_MIN_CONFIDENCE,
  ROUTE_FACTOR_WEIGHTS,
  type AdvisorFallbackReason,
  type RouteAdvice,
  type RouteAdvisor,
  type RouteCandidate,
  type RouteDecision,
  type RouteFactorKey,
  type RouteFactors,
  type RouteRequest,
  type RejectedRoute,
  type ScoredRoute,
} from '../domain/route.js';

function clamp(n: number, min = 0, max = 100): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Deterministic 0-100 factors for a single candidate. Every formula here is arithmetic on
 * published/measured numbers (fee schedules, timing, health, limits) — nothing an advisor
 * contributes to, per ADVISOR_FACTORS in the contract.
 */
export function deterministicFactors(request: RouteRequest, candidate: RouteCandidate): RouteFactors {
  const amount = new Decimal(request.amount);
  const amountNum = amount.toNumber();
  const { feePercent, feeFixed, indicativePrice } = candidate.facts;

  // netCost: effective fee expressed as a percentage of the transferred amount. Each 1
  // point of effective fee percentage costs 20 score points (0% -> 100, >=5% -> 0). A rail
  // that publishes neither feePercent nor feeFixed scores neutral 50 rather than assuming
  // it is free or expensive. An indicative SEP-38 price's own fee (a spread the rail
  // metadata does not capture) is folded in the same way when present.
  let netCost = 50;
  if (feePercent !== undefined || feeFixed !== undefined) {
    let effectivePercent = feePercent ?? 0;
    if (feeFixed !== undefined && amountNum > 0) {
      effectivePercent += (feeFixed / amountNum) * 100;
    }
    if (indicativePrice?.fee && amountNum > 0) {
      const feeInSellAsset = Number(indicativePrice.fee.total);
      if (Number.isFinite(feeInSellAsset)) {
        effectivePercent += (feeInSellAsset / amountNum) * 100;
      }
    }
    netCost = clamp(100 - effectivePercent * 20);
  }

  // speed: 2 score points lost per estimated settlement minute; unknown timing (anchors we
  // cannot execute against yet) scores neutral 50.
  const speed =
    candidate.facts.estimatedMinutes === undefined ? 50 : clamp(100 - candidate.facts.estimatedMinutes * 2);

  // reliability: passed straight through from the filter's health-derived score.
  const reliability = clamp(candidate.facts.reliability);

  // liquidity: headroom between the requested amount and the rail's published max,
  // as a percentage of that max. No published max scores 70 (plenty of room, but not the
  // full 100 an explicitly generous limit would earn) rather than assuming unlimited.
  const max = candidate.rail.max !== undefined ? new Decimal(candidate.rail.max) : undefined;
  const liquidity = !max || max.isZero() ? 70 : clamp(max.minus(amount).div(max).mul(100).toNumber());

  // horizonFit: neutral unless the user gave us a target; a tight horizon (<=7 days)
  // rewards the same routes that already score well on speed.
  const horizonFit = request.user && request.user.daysToTarget <= 7 ? speed : 50;

  // riskFit: neutral unless the user is conservative (riskProfile 0), in which case it
  // rewards the same routes that already score well on reliability.
  const riskFit = request.user && request.user.riskProfile === 0 ? reliability : 50;

  // yieldImpact: Phase 2 route facts carry no yield signal (that lives in the yield
  // engine, not the anchor directory); neutral until routing is wired to DeFindex positions.
  const yieldImpact = 50;

  return { netCost, speed, reliability, liquidity, horizonFit, riskFit, yieldImpact };
}

function isAdvisorFactorKey(key: string): key is RouteFactorKey {
  return (ADVISOR_FACTORS as readonly string[]).includes(key);
}

/** Resolves once `advisor.advise` settles, or once `ms` elapses, whichever comes first. */
function withAdvisorTimeout(promise: Promise<RouteAdvice[]>, ms: number): Promise<RouteAdvice[] | 'timeout'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('timeout'), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export interface DecideRouteOptions {
  minConfidence?: number;
  timeoutMs?: number;
  now?: () => Date;
}

/**
 * Merges advisor judgment (bounded, optional, only for ADVISOR_FACTORS) into deterministic
 * factors, then scores and ranks candidates using ROUTE_FACTOR_WEIGHTS. Never throws: an
 * advisor timeout, error, or unusable output simply falls back to pure deterministic
 * scoring, and the reason is recorded on `advisor.fallbackReason`.
 */
export async function decideRoute(
  request: RouteRequest,
  candidates: RouteCandidate[],
  rejected: RejectedRoute[],
  advisor: RouteAdvisor,
  opts: DecideRouteOptions = {},
): Promise<RouteDecision> {
  const minConfidence = opts.minConfidence ?? DEFAULT_ADVISOR_MIN_CONFIDENCE;
  const timeoutMs = opts.timeoutMs ?? 3000;
  const now = opts.now ?? (() => new Date());

  const deterministicByRoute = new Map<string, RouteFactors>();
  for (const candidate of candidates) {
    deterministicByRoute.set(candidate.routeId, deterministicFactors(request, candidate));
  }

  const adviceByRoute = new Map<string, RouteAdvice>();
  let fallbackReason: AdvisorFallbackReason | undefined;

  if (advisor.name === 'none') {
    fallbackReason = 'disabled';
  } else if (candidates.length === 0) {
    fallbackReason = 'no_routes';
  } else {
    try {
      const advicePromise = advisor.advise({ request, routes: candidates });
      // Attach a no-op handler to the original promise so a late rejection (advisor lost
      // the timeout race) never surfaces as an unhandled rejection.
      advicePromise.catch(() => undefined);
      const result = await withAdvisorTimeout(advicePromise, timeoutMs);

      if (result === 'timeout') {
        fallbackReason = 'timeout';
      } else if (!Array.isArray(result) || result.length === 0) {
        fallbackReason = 'invalid_output';
      } else {
        const knownEntries = result.filter(
          (advice): advice is RouteAdvice =>
            Boolean(advice) &&
            typeof advice.routeId === 'string' &&
            deterministicByRoute.has(advice.routeId) &&
            typeof advice.confidence === 'number',
        );
        if (knownEntries.length === 0) {
          fallbackReason = 'invalid_output';
        } else {
          const usableEntries = knownEntries.filter((advice) => advice.confidence >= minConfidence);
          if (usableEntries.length === 0) {
            fallbackReason = 'low_confidence';
          } else {
            for (const advice of usableEntries) {
              adviceByRoute.set(advice.routeId, advice);
            }
          }
        }
      }
    } catch {
      fallbackReason = 'error';
    }
  }

  let advisorUsed = false;

  const eligible: ScoredRoute[] = candidates.map((candidate) => {
    const deterministic = deterministicByRoute.get(candidate.routeId) ?? deterministicFactors(request, candidate);
    const factors: RouteFactors = { ...deterministic };
    const factorSources: Record<RouteFactorKey, 'deterministic' | 'advisor'> = {
      netCost: 'deterministic',
      speed: 'deterministic',
      reliability: 'deterministic',
      liquidity: 'deterministic',
      horizonFit: 'deterministic',
      riskFit: 'deterministic',
      yieldImpact: 'deterministic',
    };

    const advice = adviceByRoute.get(candidate.routeId);
    if (advice) {
      for (const [key, value] of Object.entries(advice.factors)) {
        if (value === undefined || !isAdvisorFactorKey(key)) continue;
        factors[key] = clamp(value);
        factorSources[key] = 'advisor';
        advisorUsed = true;
      }
    }

    const rawScore = (Object.keys(ROUTE_FACTOR_WEIGHTS) as RouteFactorKey[]).reduce(
      (sum, key) => sum + (ROUTE_FACTOR_WEIGHTS[key] * factors[key]) / 100,
      0,
    );
    const score = Math.round(rawScore * 10) / 10;

    return {
      routeId: candidate.routeId,
      anchorId: candidate.anchorId,
      anchorName: candidate.anchorName,
      status: candidate.status,
      score,
      factors,
      factorSources,
      advisorRationale: advice?.rationale,
    };
  });

  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aExecutable = a.status === 'EXECUTABLE' ? 0 : 1;
    const bExecutable = b.status === 'EXECUTABLE' ? 0 : 1;
    if (aExecutable !== bExecutable) return aExecutable - bExecutable;
    return a.routeId.localeCompare(b.routeId);
  });

  const chosen = eligible[0] ?? null;
  const executable = Boolean(chosen && chosen.status === 'EXECUTABLE');

  return {
    request,
    eligible,
    rejected,
    chosen,
    executable,
    advisor: {
      name: advisor.name,
      used: advisorUsed,
      minConfidence,
      fallbackReason,
    },
    decidedAt: now().toISOString(),
  };
}
