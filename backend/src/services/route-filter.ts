import type { AnchorAssetRail, AnchorSnapshot } from '../domain/anchor.js';
import type {
  RejectedRoute,
  RouteCandidate,
  RouteFacts,
  RouteRejectReason,
  RouteRequest,
} from '../domain/route.js';
import { Decimal } from '../domain/money.js';

/**
 * Estimated settlement minutes we can honestly publish today. Only the TR mock anchor is
 * EXECUTABLE, and its SEP-6 processing times are fixed configuration, not a measurement —
 * every other anchor's timing is unknown until it is wired for execution.
 */
const EXECUTABLE_ESTIMATED_MINUTES: Record<RouteRequest['direction'], number> = {
  deposit: 2,
  withdraw: 30,
};

function estimatedMinutesFor(
  status: AnchorSnapshot['status'],
  direction: RouteRequest['direction'],
): number | undefined {
  return status === 'EXECUTABLE' ? EXECUTABLE_ESTIMATED_MINUTES[direction] : undefined;
}

function reliabilityFromHealth(healthy: boolean): number {
  return healthy ? 90 : 30;
}

/** The single rail this request would use on this anchor, if any is enabled for it. */
function findRail(anchor: AnchorSnapshot, request: RouteRequest): AnchorAssetRail | undefined {
  return anchor.rails.find(
    (rail) => rail.enabled && rail.direction === request.direction && rail.assetCode === request.assetCode,
  );
}

/**
 * Pure deterministic filter: for every anchor, accumulate every rejection reason that
 * applies (an anchor can be rejected for several reasons at once), or produce exactly one
 * RouteCandidate when none apply.
 */
export function filterRoutes(
  request: RouteRequest,
  anchors: AnchorSnapshot[],
): { candidates: RouteCandidate[]; rejected: RejectedRoute[] } {
  const candidates: RouteCandidate[] = [];
  const rejected: RejectedRoute[] = [];

  for (const anchor of anchors) {
    const reasons: RouteRejectReason[] = [];
    const details: string[] = [];

    if (anchor.status === 'UNAVAILABLE') {
      reasons.push('UNAVAILABLE');
      details.push(anchor.statusReason ?? 'anchor unavailable');
    }

    if (!anchor.seps.includes('sep6') || !anchor.seps.includes('sep10')) {
      reasons.push('SEP_MISSING');
      details.push('anchor does not publish both SEP-6 and SEP-10');
    }

    const rail = findRail(anchor, request);
    if (!rail) {
      reasons.push('DIRECTION_UNSUPPORTED');
      details.push(`no enabled ${request.direction} rail for ${request.assetCode}`);
    } else if (rail.fiat.length === 0 || !rail.fiat.includes(request.fiatCurrency)) {
      reasons.push('CURRENCY_UNSUPPORTED');
      details.push(
        rail.fiat.length === 0
          ? `${request.fiatCurrency} unsupported: rail does not publish any fiat currency`
          : `${request.fiatCurrency} unsupported: rail supports [${rail.fiat.join(', ')}]`,
      );
    } else {
      const amount = new Decimal(request.amount);
      if (rail.min !== undefined && amount.lt(rail.min)) {
        reasons.push('BELOW_MIN');
        details.push(`amount ${request.amount} below rail min ${rail.min}`);
      }
      if (rail.max !== undefined && amount.gt(rail.max)) {
        reasons.push('ABOVE_MAX');
        details.push(`amount ${request.amount} above rail max ${rail.max}`);
      }
    }

    if (anchor.status === 'EXECUTABLE' && (request.kycStatus === 'NEEDS_INFO' || request.kycStatus === 'REJECTED')) {
      reasons.push('KYC_REQUIRED');
      details.push(`kyc status ${request.kycStatus} blocks execution`);
    }

    if (request.requireExecutable && anchor.status !== 'EXECUTABLE') {
      reasons.push('NOT_EXECUTABLE');
      details.push(`requireExecutable set but anchor status is ${anchor.status}`);
    }

    if (reasons.length > 0) {
      rejected.push({
        anchorId: anchor.id,
        anchorDomain: anchor.domain,
        anchorName: anchor.name,
        status: anchor.status,
        reasons,
        detail: details.length > 0 ? details.join('; ') : undefined,
      });
      continue;
    }

    // reasons.length === 0 implies DIRECTION_UNSUPPORTED / CURRENCY_UNSUPPORTED were not
    // hit, so `rail` is defined here.
    if (!rail) continue;

    const facts: RouteFacts = {
      feePercent: rail.feePercent !== undefined ? Number(rail.feePercent) : undefined,
      feeFixed: rail.feeFixed !== undefined ? Number(rail.feeFixed) : undefined,
      estimatedMinutes: estimatedMinutesFor(anchor.status, request.direction),
      reliability: reliabilityFromHealth(anchor.healthy),
    };

    candidates.push({
      routeId: `${anchor.id}:${request.direction}:${request.assetCode}:${request.fiatCurrency}`,
      anchorId: anchor.id,
      anchorDomain: anchor.domain,
      anchorName: anchor.name,
      status: anchor.status,
      rail,
      facts,
    });
  }

  return { candidates, rejected };
}
