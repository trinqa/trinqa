import { useEffect, useState } from 'react';

import { getPayRecipient } from '@/config/env';
import { paymentRecipients } from '@/data/mocks/pay';
import { api } from '@/services/api';
import { BackendApiError, errorMessage } from '@/services/apiErrors';

/** Where a payment to a seeded contact actually lands on Stellar. */
export interface RecipientAccount {
  account: string;
  /** True when EXPO_PUBLIC_PAY_RECIPIENT redirects payments away from the contact. */
  overridden: boolean;
}

let pending: Promise<Map<string, string>> | null = null;

/**
 * The backend funds each contact and adds its USDC trustline on the first call,
 * which takes seconds, so one request covers every contact and the result is
 * cached for the session.
 */
function resolveAll(): Promise<Map<string, string>> {
  if (!pending) {
    pending = api
      .demoContacts(paymentRecipients.map((recipient) => recipient.id))
      .then((response) => new Map(response.contacts.map((contact) => [contact.id, contact.account])))
      .catch((err: unknown) => {
        // A failed seeding must not poison the session; drop the cache so the next attempt retries.
        pending = null;
        throw err;
      });
  }
  return pending;
}

/**
 * The account a payment to `recipientId` will credit. Throws rather than falling
 * back to anything else: a payment with no recipient must not leave the app.
 */
export async function recipientAccount(recipientId: string): Promise<RecipientAccount> {
  const override = getPayRecipient();
  if (override) return { account: override, overridden: true };

  const accounts = await resolveAll();
  const account = accounts.get(recipientId);
  if (!account) {
    throw new BackendApiError(
      'RECIPIENT_UNRESOLVED',
      'This contact does not have an account yet.',
      502,
    );
  }
  return { account, overridden: false };
}

export interface RecipientAccountState {
  data: RecipientAccount | null;
  loading: boolean;
  error: string | null;
}

/** Resolves the chosen contact's account, so the pay flow can wait on it before quoting. */
export function useRecipientAccount(recipientId: string | null): RecipientAccountState {
  const [state, setState] = useState<RecipientAccountState>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!recipientId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    recipientAccount(recipientId).then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [recipientId]);

  return state;
}
