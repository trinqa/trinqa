import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { RoutePlanner } from '../../src/services/route-planner.service.js';
import { NoopAdvisor } from '../../src/services/route-advisor.js';
import { registerRouteRoutes } from '../../src/routes/v1/routes.js';
import type {
  AnchorAdapter,
  AnchorAssetRail,
  AnchorDirectory,
  AnchorSnapshot,
  IndicativePrice,
  IndicativePriceRequest,
} from '../../src/domain/anchor.js';

const USDC_ISSUER = 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH';

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

function snapshot(overrides: Partial<AnchorSnapshot> = {}): AnchorSnapshot {
  return {
    id: 'tr-mock-anchor.fly.dev',
    domain: 'tr-mock-anchor.fly.dev',
    name: 'TR Mock Anchor',
    status: 'EXECUTABLE',
    seps: ['sep1', 'sep6', 'sep10', 'sep38'],
    rails: [rail()],
    healthy: true,
    network: 'testnet',
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

class FakeDirectory implements AnchorDirectory {
  constructor(
    private readonly snapshots: AnchorSnapshot[],
    private readonly adapters: Record<string, AnchorAdapter> = {},
  ) {}
  async list(): Promise<AnchorSnapshot[]> {
    return this.snapshots;
  }
  adapter(id: string): AnchorAdapter | undefined {
    return this.adapters[id];
  }
}

function fakeAdapter(id: string, domain: string, price: IndicativePrice | null | 'throw'): AnchorAdapter {
  return {
    id,
    domain,
    async snapshot() {
      throw new Error('not used in these tests');
    },
    async indicativePrice(_req: IndicativePriceRequest) {
      if (price === 'throw') throw new Error('anchor unreachable');
      return price;
    },
  };
}

describe('RoutePlanner.preview', () => {
  it('returns EXECUTABLE, QUOTE_ONLY candidates and folds UNAVAILABLE into rejected', async () => {
    const executable = snapshot();
    const quoteOnly = snapshot({
      id: 'quote-only.example',
      domain: 'quote-only.example',
      status: 'QUOTE_ONLY',
      healthy: true,
    });
    const unavailable = snapshot({
      id: 'down.example',
      domain: 'down.example',
      status: 'UNAVAILABLE',
      statusReason: 'unreachable',
      rails: [],
    });
    const directory = new FakeDirectory([executable, quoteOnly, unavailable]);
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    const decision = await planner.preview({
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '10',
    });

    expect(decision.eligible.map((r) => r.anchorId).sort()).toEqual([
      'quote-only.example',
      'tr-mock-anchor.fly.dev',
    ]);
    expect(decision.rejected).toHaveLength(1);
    expect(decision.rejected[0]!.anchorId).toBe('down.example');
    expect(decision.chosen).not.toBeNull();
    // executable must faithfully mirror the chosen route's own status, whichever one wins.
    expect(decision.executable).toBe(decision.chosen?.status === 'EXECUTABLE');
  });

  it('attaches an indicative price to a QUOTE_ONLY candidate using the withdraw asset direction', async () => {
    const quoteOnly = snapshot({ id: 'quote-only.example', domain: 'quote-only.example', status: 'QUOTE_ONLY' });
    const price: IndicativePrice = {
      anchorId: 'quote-only.example',
      sellAsset: `stellar:USDC:${USDC_ISSUER}`,
      buyAsset: 'iso4217:TRY',
      sellAmount: '10',
      buyAmount: '340',
      price: '34',
      firm: false,
      source: 'sep38_price',
    };
    const adapter = fakeAdapter('quote-only.example', 'quote-only.example', price);
    const priceSpy = vi.spyOn(adapter, 'indicativePrice');
    const directory = new FakeDirectory([quoteOnly], { 'quote-only.example': adapter });
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    const decision = await planner.preview({
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '10',
    });

    expect(priceSpy).toHaveBeenCalledWith({
      sellAsset: `stellar:USDC:${USDC_ISSUER}`,
      buyAsset: 'iso4217:TRY',
      sellAmount: '10',
    });
    expect(decision.eligible[0]!.routeId).toBe('quote-only.example:withdraw:USDC:TRY');
  });

  it('reverses the asset direction for deposit indicative price lookups', async () => {
    const quoteOnly = snapshot({
      id: 'quote-only.example',
      domain: 'quote-only.example',
      status: 'QUOTE_ONLY',
      rails: [rail({ direction: 'deposit' })],
    });
    const adapter = fakeAdapter('quote-only.example', 'quote-only.example', null);
    const priceSpy = vi.spyOn(adapter, 'indicativePrice');
    const directory = new FakeDirectory([quoteOnly], { 'quote-only.example': adapter });
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    await planner.preview({ direction: 'deposit', fiatCurrency: 'TRY', assetCode: 'USDC', amount: '10' });

    expect(priceSpy).toHaveBeenCalledWith({
      sellAsset: 'iso4217:TRY',
      buyAsset: `stellar:USDC:${USDC_ISSUER}`,
      sellAmount: '10',
    });
  });

  it('tolerates an indicative price failure (throw) without failing the preview', async () => {
    const quoteOnly = snapshot({ id: 'quote-only.example', domain: 'quote-only.example', status: 'QUOTE_ONLY' });
    const adapter = fakeAdapter('quote-only.example', 'quote-only.example', 'throw');
    const directory = new FakeDirectory([quoteOnly], { 'quote-only.example': adapter });
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    const decision = await planner.preview({
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '10',
    });

    expect(decision.eligible).toHaveLength(1);
    expect(decision.eligible[0]!.factors.netCost).toBeDefined();
  });

  it('tolerates an indicative price failure (null) without failing the preview', async () => {
    const quoteOnly = snapshot({ id: 'quote-only.example', domain: 'quote-only.example', status: 'QUOTE_ONLY' });
    const adapter = fakeAdapter('quote-only.example', 'quote-only.example', null);
    const directory = new FakeDirectory([quoteOnly], { 'quote-only.example': adapter });
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    const decision = await planner.preview({
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '10',
    });

    expect(decision.eligible).toHaveLength(1);
  });

  it('skips price lookups entirely for EXECUTABLE candidates', async () => {
    const executable = snapshot();
    const adapter = fakeAdapter('tr-mock-anchor.fly.dev', 'tr-mock-anchor.fly.dev', null);
    const priceSpy = vi.spyOn(adapter, 'indicativePrice');
    const directory = new FakeDirectory([executable], { 'tr-mock-anchor.fly.dev': adapter });
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });

    await planner.preview({ direction: 'withdraw', fiatCurrency: 'TRY', assetCode: 'USDC', amount: '10' });

    expect(priceSpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/routes/preview', () => {
  async function buildTestApp() {
    const executable = snapshot();
    const directory = new FakeDirectory([executable]);
    const planner = new RoutePlanner(directory, new NoopAdvisor(), { usdcIssuer: USDC_ISSUER });
    const app = Fastify();
    registerRouteRoutes(app, planner);
    await app.ready();
    return app;
  }

  it('returns a RouteDecision for a valid query', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/routes/preview?direction=withdraw&currency=TRY&amount=10',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.eligible).toHaveLength(1);
    expect(body.chosen.anchorId).toBe('tr-mock-anchor.fly.dev');
    expect(body.executable).toBe(true);
    await app.close();
  });

  it('parses riskProfile, daysToTarget and requireExecutable from the query string', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/routes/preview?direction=withdraw&currency=TRY&amount=10&riskProfile=0&daysToTarget=3&requireExecutable=false',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.request.user).toEqual({ riskProfile: 0, daysToTarget: 3 });
    expect(body.request.requireExecutable).toBe(false);
    await app.close();
  });

  it('rejects an invalid query with a 4xx', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/routes/preview?direction=sideways&currency=TRY&amount=10',
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    await app.close();
  });
});
