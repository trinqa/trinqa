import { describe, expect, it } from 'vitest';
import {
  DeterministicRiskEngine,
  RISK_ENGINE_WEIGHTS,
  ROUTE_SCORE_WEIGHTS,
  scoreRoute,
} from '../../src/services/deterministic-risk-engine.js';
import type { YieldStrategy } from '../../src/domain/yield.js';

describe('DeterministicRiskEngine', () => {
  const engine = new DeterministicRiskEngine();
  const strategies: YieldStrategy[] = [
    {
      id: 's-cons',
      name: 'Conservative',
      risk: 'conservative',
      estimatedApy: 5,
      withdrawalAvailability: 'flexible',
      vaultAddress: 'CVAULT1111111111111111111111111111111111111111111111111111',
    },
    {
      id: 's-growth',
      name: 'Growth',
      risk: 'growth',
      estimatedApy: 12,
      withdrawalAvailability: '90d',
      vaultAddress: 'CVAULT1111111111111111111111111111111111111111111111111111',
    },
  ];

  it('uses PRD weights summing to 100', () => {
    const sum = Object.values(RISK_ENGINE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    const routeSum = Object.values(ROUTE_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(routeSum).toBe(100);
  });

  it('ranks conservative higher for low risk + short horizon', () => {
    const ranked = engine.rankStrategies(strategies, 0, 7);
    expect(ranked[0]?.strategy.risk).toBe('conservative');
  });

  it('scores unsupported routes negatively', () => {
    expect(
      scoreRoute({
        routeType: 'fiat_payout',
        estimatedMinutes: 30,
        feeBps: 50,
        netPayoutScore: 80,
        reliabilityScore: 80,
        kycFrictionScore: 70,
        limitsScore: 70,
        supported: false,
      }),
    ).toBe(-1);
  });

  it('prefers higher net payout when other factors equal', () => {
    const slow = scoreRoute({
      routeType: 'fiat_payout',
      estimatedMinutes: 60,
      feeBps: 50,
      netPayoutScore: 50,
      reliabilityScore: 80,
      kycFrictionScore: 70,
      limitsScore: 70,
      supported: true,
    });
    const fastHighPayout = scoreRoute({
      routeType: 'stellar_transfer',
      estimatedMinutes: 2,
      feeBps: 0,
      netPayoutScore: 95,
      reliabilityScore: 80,
      kycFrictionScore: 70,
      limitsScore: 70,
      supported: true,
    });
    expect(fastHighPayout).toBeGreaterThan(slow);
  });
});
