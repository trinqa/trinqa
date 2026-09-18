/** Normalize provider failures without leaking secrets or [object Object]. */
export function normalizeProviderError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.error === 'string') return o.error;
    if (typeof o.detail === 'string') return o.detail;
    try {
      const json = JSON.stringify(err);
      if (json.length > 500) return `${json.slice(0, 500)}…`;
      return json;
    } catch {
      return 'Provider error';
    }
  }
  return String(err);
}
