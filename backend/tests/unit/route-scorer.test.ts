import { describe, expect, it } from 'vitest';
import { deterministicFactors, decideRoute } from '../../src/services/route-scorer.js';
import type {
  AdvisorInput,
  RouteAdvice,
  RouteAdvisor,
  RouteCandidate,
  RouteRequest,
} from '../../src/domain/route.js';
import type { AnchorAssetRail } from '../../src/domain/anchor.js';

function rail(overrides: Partial<AnchorAssetRail> = {}): AnchorAssetRail {
  return {
    assetCode: 'USDC',
    direction: 'withdraw',
    enabled: true,
    fiat: ['TRY'],
    methods: ['bank_account'],
    ...overrides,
  };
}

function candidate(overrides: Partial<RouteCandidate> = {}): RouteCandidate {
  return {
    routeId: 'tr-mock-anchor.fly.dev:withdraw:USDC:TRY',
    anchorId: 'tr-mock-anchor.fly.dev',
    anchorDomain: 'tr-mock-anchor.fly.dev',
    anchorName: 'TR Mock Anchor',
    status: 'EXECUTABLE',
    rail: rail(),
    facts: { reliability: 90, estimatedMinutes: 30 },
    ...overrides,
  };
}

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    direction: 'withdraw',
    fiatCurrency: 'TRY',
    assetCode: 'USDC',
    amount: '10',
    ...overrides,
  };
}

class NoopAdvisor implements RouteAdvisor {
  readonly name = 'none' as const;
  async advise(): Promise<RouteAdvice[]> {
    return [];
  }
}

class FixedAdvisor implements RouteAdvisor {
  readonly name = 'jev' as const;
  constructor(private readonly advice: RouteAdvice[] | (() => Promise<RouteAdvice[]>)) {}
  async advise(_input: AdvisorInput): Promise<RouteAdvice[]> {
    return typeof this.advice === 'function' ? this.advice() : this.advice;
  }
}

class ThrowingAdvisor implements RouteAdvisor {
  readonly name = 'jev' as const;
  async advise(): Promise<RouteAdvice[]> {
    throw new Error('boom');
  }
}

class SlowAdvisor implements RouteAdvisor {
  readonly name = 'jev' as const;
  constructor(private readonly delayMs: number) {}
  async advise(): Promise<RouteAdvice[]> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return [];
  }
}

describe('deterministicFactors', () => {
  it('scores netCost 100 for a fee-free rail', () => {
    const c = candidate({ facts: { reliability: 90, feePercent: 0, feeFixed: 0 } });
    expect(deterministicFactors(request(), c).netCost).toBe(100);
  });

  it('scores netCost 50 when fee is entirely unknown', () => {
    const c = candidate({ facts: { reliability: 90 } });
    expect(deterministicFactors(request(), c).netCost).toBe(50);
  });

  it('lowers netCost proportionally to feePercent (1% fee => 20 points lost)', () => {
    const c = candidate({ facts: { reliability: 90, feePercent: 1 } });
    expect(deterministicFactors(request(), c).netCost).toBe(80);
  });

  it('folds feeFixed into netCost as a percentage of the amount', () => {
    // amount 10, feeFixed 0.5 => 5% effective => 100 points lost, clamped to 0.
    const c = candidate({ facts: { reliability: 90, feeFixed: 0.5 } });
    expect(deterministicFactors(request({ amount: '10' }), c).netCost).toBe(0);
  });

  it('folds indicative price fee into netCost when present', () => {
    const c = candidate({
      facts: {
        reliability: 90,
        feePercent: 0,
        indicativePrice: {
          anchorId: 'x',
          sellAsset: 'stellar:USDC:G',
          buyAsset: 'iso4217:TRY',
          sellAmount: '10',
          buyAmount: '340',
          price: '34',
          fee: { total: '0.5', asset: 'stellar:USDC:G' },
          firm: false,
          source: 'sep38_price',
        },
      },
    });
    // 0.5 / 10 * 100 = 5% => 100 points lost => clamp to 0.
    expect(deterministicFactors(request({ amount: '10' }), c).netCost).toBe(0);
  });

  it('scores speed 50 when estimatedMinutes is unknown', () => {
    const c = candidate({ facts: { reliability: 90, estimatedMinutes: undefined } });
    expect(deterministicFactors(request(), c).speed).toBe(50);
  });

  it('scores speed as clamp(100 - 2*minutes)', () => {
    const c = candidate({ facts: { reliability: 90, estimatedMinutes: 30 } });
    expect(deterministicFactors(request(), c).speed).toBe(40);
    const cSlow = candidate({ facts: { reliability: 90, estimatedMinutes: 80 } });
    expect(deterministicFactors(request(), cSlow).speed).toBe(0);
  });

  it('passes reliability straight through', () => {
    const c = candidate({ facts: { reliability: 30 } });
    expect(deterministicFactors(request(), c).reliability).toBe(30);
  });

  it('scores liquidity 70 when the rail publishes no max', () => {
    const c = candidate({ rail: rail({ max: undefined }) });
    expect(deterministicFactors(request({ amount: '10' }), c).liquidity).toBe(70);
  });

  it('scores liquidity as headroom percentage against the rail max', () => {
    const c = candidate({ rail: rail({ max: '100' }) });
    // (100-10)/100*100 = 90
    expect(deterministicFactors(request({ amount: '10' }), c).liquidity).toBe(90);
  });

  it('defaults horizonFit and riskFit to neutral 50 without a user signal', () => {
    const c = candidate();
    const factors = deterministicFactors(request(), c);
    expect(factors.horizonFit).toBe(50);
    expect(factors.riskFit).toBe(50);
  });

  it('ties horizonFit to speed when daysToTarget is tight (<=7)', () => {
    const c = candidate({ facts: { reliability: 90, estimatedMinutes: 30 } });
    const factors = deterministicFactors(request({ user: { riskProfile: 1, daysToTarget: 3 } }), c);
    expect(factors.horizonFit).toBe(factors.speed);
  });

  it('leaves horizonFit neutral when daysToTarget is not tight', () => {
    const c = candidate({ facts: { reliability: 90, estimatedMinutes: 30 } });
    const factors = deterministicFactors(request({ user: { riskProfile: 1, daysToTarget: 30 } }), c);
    expect(factors.horizonFit).toBe(50);
  });

  it('ties riskFit to reliability for a conservative user (riskProfile 0)', () => {
    const c = candidate({ facts: { reliability: 77, estimatedMinutes: 30 } });
    const factors = deterministicFactors(request({ user: { riskProfile: 0, daysToTarget: 30 } }), c);
    expect(factors.riskFit).toBe(77);
  });

  it('leaves riskFit neutral for non-conservative users', () => {
    const c = candidate({ facts: { reliability: 77, estimatedMinutes: 30 } });
    const factors = deterministicFactors(request({ user: { riskProfile: 2, daysToTarget: 30 } }), c);
    expect(factors.riskFit).toBe(50);
  });

  it('always scores yieldImpact neutral (no yield signal in Phase 2 route facts)', () => {
    expect(deterministicFactors(request(), candidate()).yieldImpact).toBe(50);
  });
});

describe('decideRoute', () => {
  it('falls back to disabled when the advisor name is "none"', async () => {
    const decision = await decideRoute(request(), [candidate()], [], new NoopAdvisor());
    expect(decision.advisor.fallbackReason).toBe('disabled');
    expect(decision.advisor.used).toBe(false);
    expect(decision.advisor.name).toBe('none');
  });

  it('falls back to no_routes when there are no candidates', async () => {
    const decision = await decideRoute(request(), [], [], new FixedAdvisor([]));
    expect(decision.advisor.fallbackReason).toBe('no_routes');
    expect(decision.chosen).toBeNull();
    expect(decision.executable).toBe(false);
  });

  it('applies advisor factors that are ADVISOR_FACTORS and meet the confidence threshold', async () => {
    const c = candidate();
    const advisor = new FixedAdvisor([
      { routeId: c.routeId, factors: { liquidity: 95, horizonFit: 10 }, confidence: 0.9 },
    ]);
    const decision = await decideRoute(request(), [c], [], advisor);
    const scored = decision.eligible[0]!;
    expect(scored.factors.liquidity).toBe(95);
    expect(scored.factors.horizonFit).toBe(10);
    expect(scored.factorSources.liquidity).toBe('advisor');
    expect(scored.factorSources.horizonFit).toBe('advisor');
    expect(decision.advisor.used).toBe(true);
    expect(decision.advisor.fallbackReason).toBeUndefined();
  });

  it('never lets the advisor set netCost or speed even if it tries to', async () => {
    const c = candidate({ facts: { reliability: 90, feePercent: 0, estimatedMinutes: 30 } });
    const advisor = new FixedAdvisor([
      {
        routeId: c.routeId,
        // netCost/speed are not RouteFactorKeys the advisor is allowed to set per
        // ADVISOR_FACTORS, but a hostile/buggy advisor could still include the keys.
        factors: { netCost: 1, speed: 1, liquidity: 60 } as unknown as RouteAdvice['factors'],
        confidence: 0.9,
      },
    ]);
    const decision = await decideRoute(request(), [c], [], advisor);
    const deterministic = deterministicFactors(request(), c);
    const scored = decision.eligible[0]!;
    expect(scored.factors.netCost).toBe(deterministic.netCost);
    expect(scored.factors.speed).toBe(deterministic.speed);
    expect(scored.factorSources.netCost).toBe('deterministic');
    expect(scored.factorSources.speed).toBe('deterministic');
    expect(scored.factors.liquidity).toBe(60);
  });

  it('ignores advice below the confidence threshold', async () => {
    const c = candidate();
    const advisor = new FixedAdvisor([{ routeId: c.routeId, factors: { liquidity: 95 }, confidence: 0.1 }]);
    const decision = await decideRoute(request(), [c], [], advisor, { minConfidence: 0.6 });
    expect(decision.advisor.fallbackReason).toBe('low_confidence');
    expect(decision.advisor.used).toBe(false);
    expect(decision.eligible[0]!.factorSources.liquidity).toBe('deterministic');
  });

  it('ignores advice for unknown routeIds', async () => {
    const c = candidate();
    const advisor = new FixedAdvisor([{ routeId: 'unknown:route', factors: { liquidity: 95 }, confidence: 0.9 }]);
    const decision = await decideRoute(request(), [c], [], advisor);
    expect(decision.advisor.fallbackReason).toBe('invalid_output');
    expect(decision.eligible[0]!.factorSources.liquidity).toBe('deterministic');
  });

  it('clamps advisor factor values into 0-100', async () => {
    const c = candidate();
    const advisor = new FixedAdvisor([
      { routeId: c.routeId, factors: { liquidity: 150, riskFit: -20 }, confidence: 0.9 },
    ]);
    const decision = await decideRoute(request(), [c], [], advisor);
    expect(decision.eligible[0]!.factors.liquidity).toBe(100);
    expect(decision.eligible[0]!.factors.riskFit).toBe(0);
  });

  it('reports invalid_output for an empty advice array from a real advisor', async () => {
    const c = candidate();
    const decision = await decideRoute(request(), [c], [], new FixedAdvisor([]));
    expect(decision.advisor.fallbackReason).toBe('invalid_output');
  });

  it('reports error when the advisor throws', async () => {
    const c = candidate();
    const decision = await decideRoute(request(), [c], [], new ThrowingAdvisor());
    expect(decision.advisor.fallbackReason).toBe('error');
    expect(decision.advisor.used).toBe(false);
  });

  it('reports timeout when the advisor is slower than timeoutMs', async () => {
    const c = candidate();
    const decision = await decideRoute(request(), [c], [], new SlowAdvisor(50), { timeoutMs: 5 });
    expect(decision.advisor.fallbackReason).toBe('timeout');
    expect(decision.advisor.used).toBe(false);
  });

  it('computes score as the weighted sum of factors, rounded to 1 decimal', async () => {
    const c = candidate({
      rail: rail({ max: '100' }),
      facts: { reliability: 90, feePercent: 0, estimatedMinutes: 30 },
    });
    const decision = await decideRoute(request({ amount: '10' }), [c], [], new NoopAdvisor());
    const factors = decision.eligible[0]!.factors;
    const expected =
      (factors.netCost * 35 +
        factors.speed * 15 +
        factors.reliability * 15 +
        factors.liquidity * 10 +
        factors.horizonFit * 10 +
        factors.riskFit * 10 +
        factors.yieldImpact * 5) /
      100;
    expect(decision.eligible[0]!.score).toBe(Math.round(expected * 10) / 10);
  });

  it('sorts eligible routes by score desc, then EXECUTABLE first, then routeId asc on ties', async () => {
    const executableLowScore = candidate({
      routeId: 'b-anchor:withdraw:USDC:TRY',
      anchorId: 'b-anchor',
      status: 'EXECUTABLE',
      facts: { reliability: 50, feePercent: 2, estimatedMinutes: 30 },
    });
    const quoteOnlySameScore = candidate({
      routeId: 'a-anchor:withdraw:USDC:TRY',
      anchorId: 'a-anchor',
      status: 'QUOTE_ONLY',
      facts: { reliability: 50, feePercent: 2, estimatedMinutes: 30 },
    });
    const decision = await decideRoute(
      request(),
      [quoteOnlySameScore, executableLowScore],
      [],
      new NoopAdvisor(),
    );
    expect(decision.eligible[0]!.score).toBe(decision.eligible[1]!.score);
    expect(decision.eligible[0]!.routeId).toBe('b-anchor:withdraw:USDC:TRY');
    expect(decision.eligible[0]!.status).toBe('EXECUTABLE');
    expect(decision.chosen?.routeId).toBe('b-anchor:withdraw:USDC:TRY');
    expect(decision.executable).toBe(true);
  });

  it('breaks ties by routeId when status is also equal', async () => {
    const a = candidate({
      routeId: 'a-anchor:withdraw:USDC:TRY',
      anchorId: 'a-anchor',
      facts: { reliability: 50, feePercent: 2, estimatedMinutes: 30 },
    });
    const z = candidate({
      routeId: 'z-anchor:withdraw:USDC:TRY',
      anchorId: 'z-anchor',
      facts: { reliability: 50, feePercent: 2, estimatedMinutes: 30 },
    });
    const decision = await decideRoute(request(), [z, a], [], new NoopAdvisor());
    expect(decision.eligible[0]!.routeId).toBe('a-anchor:withdraw:USDC:TRY');
  });

  it('sets executable false and chosen null when eligible is empty', async () => {
    const decision = await decideRoute(request(), [], [{ anchorId: 'x', anchorDomain: 'x', anchorName: 'x', status: 'UNAVAILABLE', reasons: ['UNAVAILABLE'] }], new NoopAdvisor());
    expect(decision.chosen).toBeNull();
    expect(decision.executable).toBe(false);
    expect(decision.rejected).toHaveLength(1);
  });

  it('uses the provided now() for decidedAt', async () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const decision = await decideRoute(request(), [candidate()], [], new NoopAdvisor(), { now: () => fixed });
    expect(decision.decidedAt).toBe(fixed.toISOString());
  });

  it('carries the minConfidence used into the decision', async () => {
    const decision = await decideRoute(request(), [candidate()], [], new NoopAdvisor(), { minConfidence: 0.75 });
    expect(decision.advisor.minConfidence).toBe(0.75);
  });
});
