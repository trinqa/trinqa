import { describe, expect, it } from 'vitest';
import { filterRoutes } from '../../src/services/route-filter.js';
import type { AnchorAssetRail, AnchorSnapshot } from '../../src/domain/anchor.js';
import type { RouteRequest } from '../../src/domain/route.js';

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

function anchor(overrides: Partial<AnchorSnapshot> = {}): AnchorSnapshot {
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

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    direction: 'withdraw',
    fiatCurrency: 'TRY',
    assetCode: 'USDC',
    amount: '10',
    ...overrides,
  };
}

describe('filterRoutes', () => {
  it('produces a candidate with routeId, facts and no rejection for a clean EXECUTABLE anchor', () => {
    const { candidates, rejected } = filterRoutes(request(), [anchor()]);
    expect(rejected).toEqual([]);
    expect(candidates).toHaveLength(1);
    const candidate = candidates[0]!;
    expect(candidate.routeId).toBe('tr-mock-anchor.fly.dev:withdraw:USDC:TRY');
    expect(candidate.anchorId).toBe('tr-mock-anchor.fly.dev');
    expect(candidate.status).toBe('EXECUTABLE');
    expect(candidate.facts.reliability).toBe(90);
    expect(candidate.facts.estimatedMinutes).toBe(30); // withdraw, EXECUTABLE
  });

  it('gives deposit its own estimated minutes for an EXECUTABLE anchor', () => {
    const { candidates } = filterRoutes(
      request({ direction: 'deposit' }),
      [anchor({ rails: [rail({ direction: 'deposit' })] })],
    );
    expect(candidates[0]!.facts.estimatedMinutes).toBe(2);
  });

  it('scores reliability 30 for an unhealthy anchor', () => {
    const { candidates } = filterRoutes(request(), [anchor({ healthy: false })]);
    expect(candidates[0]!.facts.reliability).toBe(30);
  });

  it('carries fee numbers from the rail onto facts', () => {
    const { candidates } = filterRoutes(
      request(),
      [anchor({ rails: [rail({ feePercent: '0.5', feeFixed: '0.1' })] })],
    );
    expect(candidates[0]!.facts.feePercent).toBe(0.5);
    expect(candidates[0]!.facts.feeFixed).toBe(0.1);
  });

  it('leaves estimatedMinutes undefined for a non-EXECUTABLE anchor', () => {
    const { candidates } = filterRoutes(
      request(),
      [anchor({ status: 'QUOTE_ONLY', rails: [rail()] })],
    );
    expect(candidates[0]!.facts.estimatedMinutes).toBeUndefined();
  });

  it('rejects UNAVAILABLE anchors and carries statusReason as detail', () => {
    const { rejected, candidates } = filterRoutes(
      request(),
      [anchor({ status: 'UNAVAILABLE', statusReason: 'connection refused' })],
    );
    expect(candidates).toEqual([]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reasons).toEqual(['UNAVAILABLE']);
    expect(rejected[0]!.detail).toContain('connection refused');
  });

  it('rejects an anchor missing sep6 or sep10 with SEP_MISSING', () => {
    const { rejected } = filterRoutes(request(), [anchor({ seps: ['sep1', 'sep38'] })]);
    expect(rejected[0]!.reasons).toEqual(['SEP_MISSING']);
  });

  it('rejects with DIRECTION_UNSUPPORTED when no enabled rail matches direction+assetCode', () => {
    const { rejected } = filterRoutes(
      request({ direction: 'deposit' }),
      [anchor({ rails: [rail({ direction: 'withdraw' })] })],
    );
    expect(rejected[0]!.reasons).toEqual(['DIRECTION_UNSUPPORTED']);
  });

  it('rejects with DIRECTION_UNSUPPORTED when the only matching rail is disabled', () => {
    const { rejected } = filterRoutes(request(), [anchor({ rails: [rail({ enabled: false })] })]);
    expect(rejected[0]!.reasons).toEqual(['DIRECTION_UNSUPPORTED']);
  });

  it('rejects with CURRENCY_UNSUPPORTED when the rail does not list the fiat currency', () => {
    const { rejected } = filterRoutes(request({ fiatCurrency: 'EUR' }), [
      anchor({ rails: [rail({ fiat: ['TRY'] })] }),
    ]);
    expect(rejected[0]!.reasons).toEqual(['CURRENCY_UNSUPPORTED']);
    expect(rejected[0]!.detail).toContain('EUR');
  });

  it('rejects with CURRENCY_UNSUPPORTED when the rail publishes no fiat currencies (unpublished)', () => {
    const { rejected } = filterRoutes(request(), [anchor({ rails: [rail({ fiat: [] })] })]);
    expect(rejected[0]!.reasons).toEqual(['CURRENCY_UNSUPPORTED']);
    expect(rejected[0]!.detail).toMatch(/unpublished|does not publish/);
  });

  it('rejects with BELOW_MIN when amount is under the rail minimum', () => {
    const { rejected } = filterRoutes(request({ amount: '1' }), [
      anchor({ rails: [rail({ min: '5' })] }),
    ]);
    expect(rejected[0]!.reasons).toEqual(['BELOW_MIN']);
  });

  it('rejects with ABOVE_MAX when amount exceeds the rail maximum', () => {
    const { rejected } = filterRoutes(request({ amount: '500' }), [
      anchor({ rails: [rail({ max: '300' })] }),
    ]);
    expect(rejected[0]!.reasons).toEqual(['ABOVE_MAX']);
  });

  it('treats undefined limits as unlimited', () => {
    const { candidates } = filterRoutes(request({ amount: '1000000' }), [
      anchor({ rails: [rail({ min: undefined, max: undefined })] }),
    ]);
    expect(candidates).toHaveLength(1);
  });

  it('rejects EXECUTABLE anchors with KYC_REQUIRED when kycStatus needs attention', () => {
    const needsInfo = filterRoutes(request({ kycStatus: 'NEEDS_INFO' }), [anchor()]);
    expect(needsInfo.rejected[0]!.reasons).toEqual(['KYC_REQUIRED']);

    const rejectedKyc = filterRoutes(request({ kycStatus: 'REJECTED' }), [anchor()]);
    expect(rejectedKyc.rejected[0]!.reasons).toEqual(['KYC_REQUIRED']);
  });

  it('does not apply KYC_REQUIRED to non-EXECUTABLE anchors', () => {
    const { candidates, rejected } = filterRoutes(
      request({ kycStatus: 'NEEDS_INFO' }),
      [anchor({ status: 'QUOTE_ONLY' })],
    );
    expect(rejected).toEqual([]);
    expect(candidates).toHaveLength(1);
  });

  it('allows ACCEPTED and UNKNOWN kycStatus through for EXECUTABLE anchors', () => {
    for (const kycStatus of ['ACCEPTED', 'UNKNOWN', undefined] as const) {
      const { rejected } = filterRoutes(request({ kycStatus }), [anchor()]);
      expect(rejected).toEqual([]);
    }
  });

  it('rejects with NOT_EXECUTABLE when requireExecutable is set and the anchor is not EXECUTABLE', () => {
    const { rejected } = filterRoutes(
      request({ requireExecutable: true }),
      [anchor({ status: 'QUOTE_ONLY' })],
    );
    expect(rejected[0]!.reasons).toEqual(['NOT_EXECUTABLE']);
  });

  it('does not reject EXECUTABLE anchors for NOT_EXECUTABLE even when requireExecutable is set', () => {
    const { rejected, candidates } = filterRoutes(request({ requireExecutable: true }), [anchor()]);
    expect(rejected).toEqual([]);
    expect(candidates).toHaveLength(1);
  });

  it('accumulates every applicable rejection reason on one anchor', () => {
    const { rejected } = filterRoutes(
      request({ kycStatus: 'REJECTED', requireExecutable: false }),
      [
        anchor({
          status: 'UNAVAILABLE',
          statusReason: 'unreachable',
          seps: ['sep1'],
          rails: [],
        }),
      ],
    );
    expect(rejected).toHaveLength(1);
    // UNAVAILABLE anchors never reach the EXECUTABLE-only KYC check, but UNAVAILABLE,
    // SEP_MISSING and DIRECTION_UNSUPPORTED (no rails at all) all apply simultaneously.
    expect(rejected[0]!.reasons).toEqual(
      expect.arrayContaining(['UNAVAILABLE', 'SEP_MISSING', 'DIRECTION_UNSUPPORTED']),
    );
    expect(rejected[0]!.reasons).toHaveLength(3);
  });

  it('accumulates CURRENCY_UNSUPPORTED together with KYC_REQUIRED on an EXECUTABLE anchor', () => {
    const { rejected } = filterRoutes(
      request({ fiatCurrency: 'EUR', kycStatus: 'REJECTED', requireExecutable: true }),
      [anchor({ status: 'EXECUTABLE', rails: [rail({ fiat: ['TRY'] })] })],
    );
    // requireExecutable is satisfied (status IS EXECUTABLE), so NOT_EXECUTABLE does not apply.
    expect(rejected[0]!.reasons).toEqual(['CURRENCY_UNSUPPORTED', 'KYC_REQUIRED']);
  });

  it('handles a mix of accepted and rejected anchors independently', () => {
    const good = anchor({ id: 'good.example', domain: 'good.example' });
    const bad = anchor({ id: 'bad.example', domain: 'bad.example', status: 'UNAVAILABLE', rails: [] });
    const { candidates, rejected } = filterRoutes(request(), [good, bad]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.anchorId).toBe('good.example');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.anchorId).toBe('bad.example');
  });
});
