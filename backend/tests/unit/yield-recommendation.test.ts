import { describe, expect, it } from 'vitest';
import {
  daysFromTargetDateIso,
  recommendationReason,
} from '../../src/domain/yield-recommendation.js';
import { DeterministicRiskEngine } from '../../src/services/deterministic-risk-engine.js';
import type { YieldStrategy } from '../../src/domain/yield.js';

describe('yield recommendation helpers', () => {
  it('computes non-negative days from ISO target date', () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    expect(daysFromTargetDateIso(future)).toBeGreaterThanOrEqual(9);
  });

  it('returns human recommendation reason', () => {
    const engine = new DeterministicRiskEngine();
    const strategy: YieldStrategy = {
      id: 's1',
      name: 'Conservative',
      risk: 'conservative',
      estimatedApy: 6,
      withdrawalAvailability: 'flexible',
      vaultAddress: 'CVAULT1111111111111111111111111111111111111111111111111111',
    };
    const scored = engine.scoreStrategy({ riskProfile: 0, daysToTarget: 14, strategy });
    expect(recommendationReason(scored).length).toBeGreaterThan(10);
  });
});
