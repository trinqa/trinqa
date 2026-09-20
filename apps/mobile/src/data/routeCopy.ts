import type { AnchorStatus, RouteFactorKey, RouteRejectReason } from '@/services/types';

/** One short clause per reason the route planner can emit, written for people who don't know SEPs. */
export const ROUTE_REJECT_REASONS: Record<RouteRejectReason, string> = {
  CURRENCY_UNSUPPORTED: 'does not pay out in this currency',
  DIRECTION_UNSUPPORTED: 'does not support withdrawals',
  BELOW_MIN: 'needs a larger amount',
  ABOVE_MAX: 'caps payouts below this amount',
  SEP_MISSING: 'does not support the connection we need',
  UNAVAILABLE: 'is not available for payouts',
  KYC_REQUIRED: 'needs identity checks to be completed first',
  NOT_EXECUTABLE: 'is not ready to complete a payout',
};

/** Plain wording for each registry status: only EXECUTABLE can move money today. */
export const ANCHOR_STATUS_COPY: Record<AnchorStatus, { label: string; explanation: string }> = {
  EXECUTABLE: {
    label: 'Can move money',
    explanation: 'Trinqa can run a real transfer through this anchor.',
  },
  QUOTE_ONLY: {
    label: 'Prices only',
    explanation: 'Trinqa can read prices here, but cannot move money through it.',
  },
  DISCOVERY_ONLY: {
    label: 'Found only',
    explanation: 'Trinqa found this anchor but could not read enough to price or move money.',
  },
  UNAVAILABLE: {
    label: 'Not usable',
    explanation: 'Trinqa cannot price or move money through this anchor right now.',
  },
};

/**
 * The seven factors in the order the planner scores them, each with its weight and a note
 * describing only what the backend actually computes. Weights are fixed and owned by the
 * server (`backend/src/domain/route.ts`, ROUTE_FACTOR_WEIGHTS) — they are not in the payload,
 * so they are restated here. They sum to 100 and reproduce the score the API returns.
 *
 * `computedNote` describes the deterministic calculation only. When a factor's source is the
 * advisor the number did not come from that calculation, so the note is replaced rather than
 * shown — see `factorSourceNote`.
 */
export const ROUTE_FACTORS: readonly {
  key: RouteFactorKey;
  label: string;
  weight: number;
  computedNote: string;
}[] = [
  {
    key: 'netCost',
    label: 'Cost',
    weight: 35,
    computedNote: 'Worked out from the fee the anchor publishes.',
  },
  {
    key: 'speed',
    label: 'Speed',
    weight: 15,
    computedNote: 'Worked out from the settlement time the anchor estimates.',
  },
  {
    key: 'reliability',
    label: 'Reliability',
    weight: 15,
    computedNote: 'Worked out from health checks and how fresh the anchor’s details are.',
  },
  {
    // "Room under the limit", not "room for your amount": the planner is asked in USDC, the
    // asset the limits are published in, so this is not headroom against the payout figure.
    key: 'liquidity',
    label: 'Room under the limit',
    weight: 10,
    computedNote: 'Worked out from how much headroom is left under the anchor’s published limit.',
  },
  {
    key: 'horizonFit',
    label: 'Fits your timing',
    weight: 10,
    computedNote: 'Left neutral: no target date was sent with this check.',
  },
  {
    key: 'riskFit',
    label: 'Fits your risk setting',
    weight: 10,
    computedNote: 'Left neutral: no risk setting was sent with this check.',
  },
  {
    key: 'yieldImpact',
    label: 'Effect on your earnings',
    weight: 5,
    computedNote: 'Not measured yet, so every route gets the same neutral value.',
  },
];

/** `advisor.name` is the only place the advisor is named; 'none' means nothing advised. */
export function advisorLabel(name: 'jev' | 'none') {
  return name === 'jev' ? 'Jev' : 'the route advisor';
}

/** Scores arrive as 68.9 or 90; keep the decimal only when the payload has one. */
export function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
