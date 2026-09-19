import { normalizeProviderError } from './provider-error.js';

const MAX_ATTEMPTS = 3;

function retryAfterMs(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const o = err as Record<string, unknown>;
  const status = o.status ?? o.statusCode ?? (o.response as { status?: number } | undefined)?.status;
  if (status !== 429) return null;
  const retryAfter =
    o.retryAfter ??
    o.retry_after ??
    (o.response as { headers?: Record<string, string> } | undefined)?.headers?.['retry-after'];
  if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
    return Math.min(retryAfter * 1000, 30_000);
  }
  if (typeof retryAfter === 'string') {
    const n = Number(retryAfter);
    if (Number.isFinite(n)) return Math.min(n * 1000, 30_000);
  }
  return 2_000;
}

/** Bounded retry for idempotent provider reads (429 only). */
export async function withProviderReadRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const delay = retryAfterMs(err);
      if (!delay || attempt === MAX_ATTEMPTS) break;
      console.log(`[provider-retry] ${label} 429, waiting ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(normalizeProviderError(last));
}
