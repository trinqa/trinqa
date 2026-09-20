import { useCallback, useEffect, useRef, useState } from 'react';

import { errorCode, errorMessage } from '@/services/apiErrors';

export interface LiveQuoteState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Backend error code, when the failure came from the BFF — lets callers branch without matching copy. */
  code: string | null;
  /** Re-runs the fetch immediately, skipping the debounce. */
  retry: () => void;
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
  const [state, setState] = useState<Omit<LiveQuoteState<T>, 'retry'>>({
    data: null,
    loading: false,
    error: null,
    code: null,
  });
  const [attempt, setAttempt] = useState(0);
  const lastKeyRef = useRef<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null, code: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null, code: null }));
    const run = () => {
      fetchQuote().then(
        (data) => {
          if (!cancelled) setState({ data, loading: false, error: null, code: null });
        },
        (err: unknown) => {
          if (!cancelled) {
            setState({
              data: null,
              loading: false,
              error: errorMessage(err),
              code: errorCode(err) ?? null,
            });
          }
        },
      );
    };
    // Only a new key comes from typing; a retry on the same key is a deliberate tap.
    const isSameKey = lastKeyRef.current === key;
    lastKeyRef.current = key;
    const timer = setTimeout(run, isSameKey ? 0 : debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // fetchQuote is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, debounceMs, attempt]);

  return { ...state, retry };
}
