import { describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../../src/services/quote-store.service.js';

describe('QuoteStore', () => {
  it('expires by provider expiresAt before local TTL', () => {
    vi.useFakeTimers();
    const store = new QuoteStore(60_000);
    const saved = store.save({
      routeType: 'stellar_transfer',
      candidateCount: 1,
      source: { assetCode: 'USDC', amount: '1' },
      destination: { currency: 'USDC', amount: '1' },
      fee: { assetCode: 'USDC', amount: '0' },
      estimatedArrivalMinutes: 1,
      expiresAt: new Date(Date.now() + 5_000).toISOString(),
      providerPayload: {},
    });
    vi.advanceTimersByTime(6_000);
    expect(() => store.get(saved.quoteId)).toThrow(/expired/i);
    vi.useRealTimers();
  });
});
