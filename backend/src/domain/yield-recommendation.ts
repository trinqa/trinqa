import type { ScoredStrategy } from '../services/deterministic-risk-engine.js';

const ACCESS_LABEL: Record<string, string> = {
  flexible: 'Usually <24h',
  '30d': 'About 30 days',
  '90d': 'About 90 days',
};

const RISK_LABEL: Record<string, string> = {
  conservative: 'Lower volatility',
  balanced: 'Moderate risk',
  growth: 'Higher expected return',
};

export function daysUntilTargetTimestamp(targetTimestampSec: string | undefined): number | undefined {
  if (!targetTimestampSec) return undefined;
  try {
    const sec = Number(BigInt(targetTimestampSec));
    if (!Number.isFinite(sec) || sec <= 0) return undefined;
    const ms = sec * 1000 - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  } catch {
    return undefined;
  }
}

export function daysFromTargetDateIso(targetDate: string): number {
  const ms = new Date(targetDate).getTime() - Date.now();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function recommendationReason(scored: ScoredStrategy): string {
  const entries = Object.entries(scored.breakdown) as [keyof typeof scored.breakdown, number][];
  const top = entries.sort((a, b) => b[1] - a[1])[0]?.[0];
  const access = ACCESS_LABEL[scored.strategy.withdrawalAvailability] ?? 'Flexible access';
  switch (top) {
    case 'liquidityHorizonFit':
      return `Matches your time horizon with ${access.toLowerCase()}.`;
    case 'riskProfileFit':
      return `${RISK_LABEL[scored.strategy.risk] ?? 'Aligned'} with your risk preference.`;
    case 'estimatedApy':
      return `Higher estimated yield (~${scored.strategy.estimatedApy}% APY) for your horizon.`;
    case 'withdrawalAvailability':
      return `${access} withdrawal access for upcoming liquidity needs.`;
    default:
      return 'Best overall fit for your policy and target date.';
  }
}

export function toRecommendationPayload(scored: ScoredStrategy, rank: number) {
  return {
    rank,
    strategyId: scored.strategy.id,
    name: scored.strategy.name,
    risk: scored.strategy.risk,
    estimatedApy: scored.strategy.estimatedApy,
    withdrawalAvailability: scored.strategy.withdrawalAvailability,
    score: Math.round(scored.score * 10) / 10,
    accessDescription: ACCESS_LABEL[scored.strategy.withdrawalAvailability] ?? 'Flexible',
    recommendationReason: recommendationReason(scored),
    breakdown: scored.breakdown,
  };
}
