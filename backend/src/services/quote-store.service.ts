import { randomUUID } from 'node:crypto';
import type { PaymentRouteQuote } from '../domain/payment.js';
import { ApiError } from '../domain/api-errors.js';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type StoredQuote = PaymentRouteQuote & { storedAt: number };

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

  get(quoteId: string): PaymentRouteQuote {
    const q = this.quotes.get(quoteId);
    if (!q) {
      throw new ApiError('NOT_FOUND', `Quote not found: ${quoteId}`, 404);
    }
    if (Date.now() - q.storedAt > this.ttlMs) {
      this.quotes.delete(quoteId);
      throw new ApiError('QUOTE_EXPIRED', 'Quote expired', 410);
    }
    return q;
  }

  isExpired(quoteId: string): boolean {
    const q = this.quotes.get(quoteId);
    if (!q) return true;
    return Date.now() - q.storedAt > this.ttlMs;
  }
}
