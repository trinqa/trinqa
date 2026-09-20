function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function optionalGAddress(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.startsWith('G') && trimmed.length === 56 ? trimmed : undefined;
}

/** Public testnet SEP-6 dest used by core E2E — not a secret. */
export const TRY_WITHDRAW_DEST = 'TR890009903460061605055303';

/** Hosted testnet BFF. Override with EXPO_PUBLIC_API_BASE_URL (e.g. http://127.0.0.1:8787 for a local backend). */
export const DEFAULT_API_BASE_URL = 'https://api.trinqa.com';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  return trimSlash(fromEnv || DEFAULT_API_BASE_URL);
}

/** Testnet demo-signer gate (x-demo-token). Ships in the bundle, so it only keeps casual callers out. */
export function getDemoAccessToken(): string | undefined {
  return process.env.EXPO_PUBLIC_DEMO_ACCESS_TOKEN?.trim() || undefined;
}

export function getOptionalAccountId(): string | undefined {
  return optionalGAddress(process.env.EXPO_PUBLIC_ACCOUNT_ID);
}

export function getPayRecipient(): string | undefined {
  return optionalGAddress(process.env.EXPO_PUBLIC_PAY_RECIPIENT);
}

/**
 * Design/offline mode. Seeds the app from local fixtures instead of calling the
 * backend, so screens can be reviewed without a demo token. Opt-in only.
 */
export function isOfflineDemo(): boolean {
  return process.env.EXPO_PUBLIC_OFFLINE_DEMO?.trim() === '1';
}
