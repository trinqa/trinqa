import { describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../../src/services/quote-store.service.js';

describe('QuoteStore expiration', () => {
  it('expires quotes after ttl', () => {
    vi.useFakeTimers();
    const store = new QuoteStore(1000);
    const q = store.save({
      routeType: 'stellar_transfer',
      source: { assetCode: 'USDC', amount: '1' },
      destination: { currency: 'USDC', amount: '1' },
      fee: { assetCode: 'USDC', amount: '0' },
      estimatedArrivalMinutes: 1,
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      providerPayload: {},
    });
    vi.advanceTimersByTime(1500);
    expect(() => store.get(q.quoteId)).toThrow(expect.objectContaining({ code: 'QUOTE_EXPIRED' }));
    vi.useRealTimers();
  });
});
