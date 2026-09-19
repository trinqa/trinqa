import { useEffect, useState } from 'react';

import { errorMessage } from '@/services/apiErrors';

export interface LiveQuoteState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches a backend quote whenever `key` changes (debounced), dropping stale responses.
 * Pass `enabled: false` to clear the quote, e.g. when the amount is zero.
 */
export function useLiveQuote<T>(
  key: string,
  enabled: boolean,
  fetchQuote: () => Promise<T>,
  debounceMs = 450,
): LiveQuoteState<T> {
  const [state, setState] = useState<LiveQuoteState<T>>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const timer = setTimeout(() => {
      fetchQuote().then(
        (data) => {
          if (!cancelled) setState({ data, loading: false, error: null });
        },
        (err: unknown) => {
          if (!cancelled) setState({ data: null, loading: false, error: errorMessage(err) });
        },
      );
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // fetchQuote is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, debounceMs]);

  return state;
}
