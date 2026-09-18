import type { YieldStrategy } from '../domain/yield.js';
import { riskTierFromProfile, type RiskTier } from '../domain/yield.js';

/** Final PRD yield scoring weights (sum = 100). */
export const RISK_ENGINE_WEIGHTS = {
  safety: 35,
  liquidity: 25,
  netYield: 20,
  assetRisk: 10,
  diversification: 10,
} as const;

export type StrategyScoreInput = {
  riskProfile: number;
  daysToTarget: number;
  strategy: YieldStrategy;
};

export type ScoredStrategy = {
  strategy: YieldStrategy;
  score: number;
  breakdown: Record<keyof typeof RISK_ENGINE_WEIGHTS, number>;
};

function strategyIntrinsicSafety(strategy: YieldStrategy): number {
  const tier = strategy.risk === 'conservative' ? 90 : strategy.risk === 'balanced' ? 65 : 40;
  return strategy.trinqaClassification ? tier : Math.min(tier + 5, 100);
}

function liquidityScore(daysToTarget: number, availability: YieldStrategy['withdrawalAvailability']): number {
  const minDays = availability === 'flexible' ? 0 : availability === '30d' ? 30 : 90;
  if (daysToTarget >= minDays) return 100;
  if (daysToTarget >= minDays * 0.5) return 55;
  return 25;
}

function netYieldScore(estimatedApy: number): number {
  const capped = Math.min(Math.max(estimatedApy, 0), 25);
  return Math.round((capped / 25) * 100);
}

function tierDistance(a: RiskTier, b: RiskTier): number {
  const order: RiskTier[] = ['conservative', 'balanced', 'growth'];
  return Math.abs(order.indexOf(a) - order.indexOf(b));
}

/** User ↔ strategy fit (independent from intrinsic strategy safety classification). */
function assetRiskFitScore(strategy: YieldStrategy, riskProfile: number): number {
  const userTier = riskTierFromProfile(riskProfile);
  const distance = tierDistance(userTier, strategy.risk);
  if (distance === 0) return 100;
  if (distance === 1) return 55;
  return 20;
}

function diversificationScore(strategy: YieldStrategy): number {
  const n = strategy.assets?.length ?? 1;
  return Math.min(100, 40 + n * 20);
}

export class DeterministicRiskEngine {
  scoreStrategy(input: StrategyScoreInput): ScoredStrategy {
    const w = RISK_ENGINE_WEIGHTS;
    const breakdown = {
      safety: (strategyIntrinsicSafety(input.strategy) * w.safety) / 100,
      liquidity: (liquidityScore(input.daysToTarget, input.strategy.withdrawalAvailability) * w.liquidity) / 100,
      netYield: (netYieldScore(input.strategy.estimatedApy) * w.netYield) / 100,
      assetRisk: (assetRiskFitScore(input.strategy, input.riskProfile) * w.assetRisk) / 100,
      diversification: (diversificationScore(input.strategy) * w.diversification) / 100,
    };
    const score =
      breakdown.safety + breakdown.liquidity + breakdown.netYield + breakdown.assetRisk + breakdown.diversification;
    return { strategy: input.strategy, score, breakdown };
  }

  rankStrategies(
    strategies: YieldStrategy[],
    riskProfile: number,
    daysToTarget: number,
  ): ScoredStrategy[] {
    return strategies
      .map((strategy) => this.scoreStrategy({ riskProfile, daysToTarget, strategy }))
      .sort((a, b) => b.score - a.score);
  }
}

export type RouteCandidate = {
  routeType: 'stellar_transfer' | 'stellar_swap_transfer' | 'fiat_payout';
  estimatedMinutes: number;
  feeBps: number;
  netPayoutScore: number;
  reliabilityScore: number;
  kycFrictionScore: number;
  limitsScore: number;
  supported: boolean;
};

/** Final PRD route scoring weights (sum = 100). */
export const ROUTE_SCORE_WEIGHTS = {
  netPayout: 40,
  settlementSpeed: 20,
  reliability: 15,
  kycFriction: 15,
  limits: 10,
} as const;

export function scoreRoute(candidate: RouteCandidate): number {
  if (!candidate.supported) return -1;
  const settlement = Math.max(0, 100 - candidate.estimatedMinutes * 2);
  const w = ROUTE_SCORE_WEIGHTS;
  return (
    (candidate.netPayoutScore * w.netPayout +
      settlement * w.settlementSpeed +
      candidate.reliabilityScore * w.reliability +
      candidate.kycFrictionScore * w.kycFriction +
      candidate.limitsScore * w.limits) /
    100
  );
}
