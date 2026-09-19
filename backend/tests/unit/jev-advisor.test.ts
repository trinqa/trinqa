import { describe, expect, it, vi } from 'vitest';
import { ADVISOR_FACTORS, type AdvisorInput, type RouteCandidate } from '../../src/domain/route.js';
import { createRouteAdvisorFromEnv, JevAdvisor } from '../../src/adapters/jev-advisor.js';

function makeRoute(overrides: Partial<RouteCandidate> = {}): RouteCandidate {
  return {
    routeId: 'tr-mock-anchor.fly.dev:withdraw:USDC:TRY',
    anchorId: 'tr-mock-anchor.fly.dev',
    anchorDomain: 'tr-mock-anchor.fly.dev',
    anchorName: 'TR Mock Anchor',
    status: 'EXECUTABLE',
    rail: {
      assetCode: 'USDC',
      direction: 'withdraw',
      enabled: true,
      fiat: ['TRY'],
      min: '10',
      max: '5000',
      methods: ['bank_account'],
    },
    facts: {
      feePercent: 0.5,
      feeFixed: 1,
      estimatedMinutes: 15,
      reliability: 90,
      indicativePrice: null,
    },
    ...overrides,
  };
}

function makeInput(routes: RouteCandidate[]): AdvisorInput {
  return {
    request: {
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '100',
      kycStatus: 'ACCEPTED',
      user: { riskProfile: 1, daysToTarget: 30 },
    },
    routes,
  };
}

function scoreAnswer(score: number, confidence: number, legendMax = 4) {
  const legend: Record<string, string> = {};
  for (let i = 0; i <= legendMax; i += 1) legend[String(i)] = `level ${i}`;
  return { type: 'score', score, confidence, legend, probabilities: {} };
}

function choiceAnswer(choice: string, confidence: number) {
  return { type: 'choice', choice, confidence, probabilities: { [choice]: confidence } };
}

/** Builds a full, valid `answers` payload for a single-route request (alias r0). */
function fullAnswersForR0(overrides: Record<string, unknown> = {}) {
  const answers: Record<string, unknown> = {};
  for (const factor of ADVISOR_FACTORS) {
    const suffix = factor.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    answers[`r0_${suffix}`] = scoreAnswer(3, 0.8);
  }
  return { ...answers, ...overrides };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('JevAdvisor request shape', () => {
  it('POSTs to the Decisions endpoint with the pinned model, bearer auth, only ADVISOR_FACTORS, safe ids, and numbers in state', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answers: fullAnswersForR0() }));
    const advisor = new JevAdvisor({ apiKey: 'sk-or-secret-key', fetch: fetchMock });

    const route = makeRoute();
    await advisor.advise(makeInput([route]));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/alpha/decisions');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-or-secret-key');
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('typesafe/jev-1.13');

    // Only ADVISOR_FACTORS (never netCost or speed) get score questions.
    const questionIds = Object.keys(body.questions);
    for (const id of questionIds) {
      expect(id).toMatch(/^[a-z0-9_]+$/);
    }
    expect(questionIds).toContain('r0_reliability');
    expect(questionIds).toContain('r0_liquidity');
    expect(questionIds).toContain('r0_horizon_fit');
    expect(questionIds).toContain('r0_risk_fit');
    expect(questionIds).toContain('r0_yield_impact');
    expect(questionIds.some((id) => id.includes('net_cost') || id.includes('netcost'))).toBe(false);
    expect(questionIds.some((id) => id.includes('speed'))).toBe(false);
    for (const id of questionIds) {
      if (id === 'best_route') continue;
      expect(body.questions[id].type).toBe('score');
    }

    // Numbers are present as context in state, not asked as questions.
    expect(body.state.request.amount).toBe('100');
    expect(body.state.routes[0].reliability).toBe(90);
    expect(body.state.routes[0].fees.percent).toBe(0.5);
    expect(body.state.routes[0].estimatedMinutes).toBe(15);
  });

  it('pins a custom model when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answers: fullAnswersForR0() }));
    const advisor = new JevAdvisor({ apiKey: 'k', model: '~typesafe/jev-latest', fetch: fetchMock });
    await advisor.advise(makeInput([makeRoute()]));
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.model).toBe('~typesafe/jev-latest');
  });
});

describe('JevAdvisor answer mapping', () => {
  it('maps a successful response to 0-100 factors, drops low-confidence factors, and averages the rest', async () => {
    const answers = {
      r0_reliability: scoreAnswer(4, 0.9), // 4/4 -> 100
      r0_liquidity: scoreAnswer(2, 0.7), // 2/4 -> 50
      r0_horizon_fit: scoreAnswer(3, 0.6), // 3/4 -> 75
      r0_risk_fit: scoreAnswer(0, 0.95), // 0/4 -> 0
      r0_yield_impact: scoreAnswer(4, 0.5), // 4/4 -> 100, lowest confidence
      best_route: choiceAnswer('r0', 0.99),
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answers }));
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });

    const route = makeRoute();
    const advice = await advisor.advise(makeInput([route, makeRoute({ routeId: 'other:withdraw:USDC:TRY' })]));

    const r0Advice = advice.find((a) => a.routeId === route.routeId);
    expect(r0Advice).toBeDefined();
    expect(r0Advice!.factors.reliability).toBe(100);
    expect(r0Advice!.factors.liquidity).toBe(50);
    expect(r0Advice!.factors.horizonFit).toBe(75);
    expect(r0Advice!.factors.riskFit).toBe(0);
    // yieldImpact came back at 0.5 confidence, below the default 0.6 gate, so it is not passed on.
    expect(r0Advice!.factors.yieldImpact).toBeUndefined();
    expect(r0Advice!.confidence).toBeCloseTo((0.9 + 0.7 + 0.6 + 0.95) / 4, 5); // mean of kept factors
    expect(r0Advice!.rationale).toMatch(/highest/i);
  });

  it('returns [] when routes is empty, without calling fetch', async () => {
    const fetchMock = vi.fn();
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([]));
    expect(advice).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops only the incomplete route when one route is missing an answer', async () => {
    const complete = fullAnswersForR0();
    const answers = {
      ...complete,
      // r1 only gets 4 of 5 factors -> incomplete, should be skipped entirely.
      r1_reliability: scoreAnswer(3, 0.8),
      r1_liquidity: scoreAnswer(3, 0.8),
      r1_horizon_fit: scoreAnswer(3, 0.8),
      r1_risk_fit: scoreAnswer(3, 0.8),
      // r1_yield_impact intentionally missing
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answers }));
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });

    const routeA = makeRoute({ routeId: 'a' });
    const routeB = makeRoute({ routeId: 'b' });
    const advice = await advisor.advise(makeInput([routeA, routeB]));

    expect(advice).toHaveLength(1);
    expect(advice[0]!.routeId).toBe('a');
  });

  it('normalizes using the rubric length when legend is absent', async () => {
    const answers = fullAnswersForR0({
      r0_reliability: { type: 'score', score: 2, confidence: 0.8 }, // no legend -> fallback to rubric length 5 (0-4)
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ answers }));
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice[0]!.factors.reliability).toBe(50); // 2/4 * 100
  });
});

describe('JevAdvisor failure handling', () => {
  it('resolves to [] on timeout', async () => {
    const advisor = new JevAdvisor({
      apiKey: 'k',
      timeoutMs: 10,
      fetch: (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice).toEqual([]);
  });

  it('resolves to [] on a 401 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    const advisor = new JevAdvisor({ apiKey: 'bad-key', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice).toEqual([]);
  });

  it('resolves to [] on malformed JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice).toEqual([]);
  });

  it('resolves to [] when the response has no answers object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ model: 'typesafe/jev-1.13' }));
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice).toEqual([]);
  });

  it('resolves to [] on a network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const advisor = new JevAdvisor({ apiKey: 'k', fetch: fetchMock });
    const advice = await advisor.advise(makeInput([makeRoute()]));
    expect(advice).toEqual([]);
  });

  it('never leaks the API key in a thrown error, log, or returned value', async () => {
    const secret = 'sk-or-super-secret-value';
    const fetchMock = vi.fn().mockRejectedValue(new Error('boom'));
    const advisor = new JevAdvisor({ apiKey: secret, fetch: fetchMock });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    let thrown: unknown = null;
    let result: unknown = null;
    try {
      result = await advisor.advise(makeInput([makeRoute()]));
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeNull();
    expect(JSON.stringify(result)).not.toContain(secret);
    for (const call of [...consoleSpy.mock.calls, ...logSpy.mock.calls]) {
      expect(JSON.stringify(call)).not.toContain(secret);
    }

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('createRouteAdvisorFromEnv', () => {
  it('returns null when OPENROUTER_API_KEY is missing', () => {
    expect(createRouteAdvisorFromEnv({})).toBeNull();
  });

  it('returns null when JEV_ENABLED is "false", even with a key', () => {
    expect(createRouteAdvisorFromEnv({ OPENROUTER_API_KEY: 'k', JEV_ENABLED: 'false' })).toBeNull();
  });

  it('returns a JevAdvisor when a key is set and JEV_ENABLED is not "false"', () => {
    const advisor = createRouteAdvisorFromEnv({ OPENROUTER_API_KEY: 'k' });
    expect(advisor).toBeInstanceOf(JevAdvisor);
    expect(advisor?.name).toBe('jev');
  });

  it('returns a JevAdvisor when JEV_ENABLED is explicitly "true"', () => {
    const advisor = createRouteAdvisorFromEnv({ OPENROUTER_API_KEY: 'k', JEV_ENABLED: 'true' });
    expect(advisor).toBeInstanceOf(JevAdvisor);
  });
});
