import { randomUUID } from 'node:crypto';
import type { PaymentRouteQuote } from '../domain/payment.js';
import { ApiError } from '../domain/api-errors.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type StoredQuote = PaymentRouteQuote & { storedAt: number };

function parseExpiresAt(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export class QuoteStore {
  private readonly quotes = new Map<string, StoredQuote>();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  save(quote: Omit<PaymentRouteQuote, 'quoteId'>): PaymentRouteQuote {
    const quoteId = randomUUID();
    const full: StoredQuote = {
      ...quote,
      quoteId,
      storedAt: Date.now(),
    };
    this.quotes.set(quoteId, full);
    return full;
  }

  private assertNotExpired(q: StoredQuote): void {
    const now = Date.now();
    if (now - q.storedAt > this.ttlMs) {
      this.quotes.delete(q.quoteId);
      throw new ApiError('QUOTE_EXPIRED', 'Quote expired (local TTL)', 410);
    }
    const providerExpiry = parseExpiresAt(q.expiresAt);
    if (providerExpiry > 0 && now > providerExpiry) {
      this.quotes.delete(q.quoteId);
      throw new ApiError('QUOTE_EXPIRED', 'Quote expired (provider)', 410);
    }
  }

  get(quoteId: string): PaymentRouteQuote {
    const q = this.quotes.get(quoteId);
    if (!q) {
      throw new ApiError('NOT_FOUND', `Quote not found: ${quoteId}`, 404);
    }
    this.assertNotExpired(q);
    return q;
  }

  isExpired(quoteId: string): boolean {
    const q = this.quotes.get(quoteId);
    if (!q) return true;
    try {
      this.assertNotExpired(q);
      return false;
    } catch {
      return true;
    }
  }
}
