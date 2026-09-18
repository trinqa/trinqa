import type { YieldStrategy } from '../domain/yield.js';

/** PRD-aligned deterministic weights (must sum to 100). */
export const RISK_ENGINE_WEIGHTS = {
  riskProfileFit: 35,
  liquidityHorizonFit: 35,
  estimatedApy: 20,
  withdrawalAvailability: 10,
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

function riskProfileFit(userRisk: number, strategyRisk: YieldStrategy['risk']): number {
  const tier = strategyRisk === 'conservative' ? 0 : strategyRisk === 'balanced' ? 1 : 2;
  const distance = Math.abs(userRisk - tier);
  if (distance === 0) return 100;
  if (distance === 1) return 55;
  return 20;
}

function liquidityHorizonFit(daysToTarget: number, availability: YieldStrategy['withdrawalAvailability']): number {
  const minDays = availability === 'flexible' ? 0 : availability === '30d' ? 30 : 90;
  if (daysToTarget >= minDays) return 100;
  if (daysToTarget >= minDays * 0.5) return 60;
  return 25;
}

function apyScore(estimatedApy: number): number {
  const capped = Math.min(Math.max(estimatedApy, 0), 25);
  return Math.round((capped / 25) * 100);
}

function withdrawalScore(availability: YieldStrategy['withdrawalAvailability']): number {
  if (availability === 'flexible') return 100;
  if (availability === '30d') return 70;
  return 40;
}

export class DeterministicRiskEngine {
  scoreStrategy(input: StrategyScoreInput): ScoredStrategy {
    const w = RISK_ENGINE_WEIGHTS;
    const breakdown = {
      riskProfileFit: (riskProfileFit(input.riskProfile, input.strategy.risk) * w.riskProfileFit) / 100,
      liquidityHorizonFit:
        (liquidityHorizonFit(input.daysToTarget, input.strategy.withdrawalAvailability) * w.liquidityHorizonFit) /
        100,
      estimatedApy: (apyScore(input.strategy.estimatedApy) * w.estimatedApy) / 100,
      withdrawalAvailability:
        (withdrawalScore(input.strategy.withdrawalAvailability) * w.withdrawalAvailability) / 100,
    };
    const score =
      breakdown.riskProfileFit +
      breakdown.liquidityHorizonFit +
      breakdown.estimatedApy +
      breakdown.withdrawalAvailability;
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
  supported: boolean;
};

export const ROUTE_SCORE_WEIGHTS = {
  arrivalTime: 40,
  fee: 35,
  reliability: 25,
} as const;

export function scoreRoute(candidate: RouteCandidate): number {
  if (!candidate.supported) return -1;
  const arrival = Math.max(0, 100 - candidate.estimatedMinutes);
  const fee = Math.max(0, 100 - candidate.feeBps / 10);
  const reliability = 100;
  const w = ROUTE_SCORE_WEIGHTS;
  return (arrival * w.arrivalTime + fee * w.fee + reliability * w.reliability) / 100;
}
