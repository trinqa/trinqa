export class BackendApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

/**
 * Human copy for the error codes the BFF can return. Backend messages are written for
 * operators, so the code wins whenever we have a mapping for it.
 */
const ERROR_COPY: Record<string, string> = {
  ADAPTER_UNAVAILABLE: "A provider we rely on isn't responding. Try again in a moment.",
  ROUTE_UNAVAILABLE: "We can't route this transfer right now.",
  NO_SUPPORTED_PAYOUT_RAIL: 'This currency has no payout rail yet.',
  ASSET_ROUTE_UNAVAILABLE: 'This currency pair has no route yet.',
  AMOUNT_OUT_OF_RANGE: 'That amount is outside the limits for this route.',
  INSUFFICIENT_BALANCE: "You don't have enough balance for this amount, fees included.",
  QUOTE_EXPIRED: 'The rate expired. Check the new quote and confirm again.',
  PROVIDER_QUOTE_EXPIRED: 'The rate expired. Check the new quote and confirm again.',
  QUOTE_ALREADY_USED: 'That quote was already used. Start again for a fresh rate.',
  ANCHOR_REJECTED: 'The bank partner rejected this transfer.',
  ANCHOR_SESSION_INVALID: 'The bank session expired. Try again.',
  POLICY_DENIED: 'Your spending policy blocked this transfer.',
  EARN_UNWIND_REQUIRED: 'Move funds out of Earn first, then try again.',
  EARN_UNWIND_APPROVAL_REQUIRED: 'Approve the Earn withdrawal first, then try again.',
  SMART_WALLET_FLOW_REQUIRED: 'This account needs the smart wallet flow, which this build does not support.',
  DEFINDEX_VAULT_ASSET_MISMATCH: 'This strategy does not accept the asset you are depositing.',
  SIGNED_TX_MISMATCH: 'The signed transaction did not match what we built. Nothing was sent.',
  INVALID_OPERATION_STATE: 'This transfer is no longer in a state we can continue.',
  ALREADY_COMPLETED: 'This transfer already completed.',
  VALIDATION_ERROR: "Some of those details weren't accepted.",
  NOT_FOUND: "We couldn't find that record.",
  TRANSFER_TIMEOUT: 'The transfer is taking longer than usual. Check Activity in a few minutes.',
  TRANSFER_FAILED: 'The bank partner could not complete the transfer.',
  PAYMENT_FAILED: 'The payment could not be submitted.',
  POLICY_FAILED: 'The spending policy could not be set up.',
  ACCOUNT_UNCONFIGURED: 'This build has no Stellar account configured yet.',
  REQUEST_FAILED: "Couldn't reach Trinqa. Check your connection and try again.",
};

/** Copy for a bare backend code that never travelled as an error, e.g. a capability's `reason`. */
export function describeCode(code: string, fallback = 'This route is unavailable right now.'): string {
  return ERROR_COPY[code] || fallback;
}

/** The backend error code, when the failure came from the BFF. */
export function errorCode(err: unknown): string | undefined {
  return err instanceof BackendApiError ? err.code : undefined;
}

export function isErrorCode(err: unknown, ...codes: readonly string[]): boolean {
  const code = errorCode(err);
  return code !== undefined && codes.includes(code);
}

/**
 * Copy to show the user. Prefers our mapping for known codes, then the backend message,
 * and never leaks a bare error code.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof BackendApiError) {
    return ERROR_COPY[err.code] || err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
