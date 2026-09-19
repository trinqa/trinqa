function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function optionalGAddress(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.startsWith('G') && trimmed.length === 56 ? trimmed : undefined;
}

/** Public testnet SEP-6 dest used by core E2E — not a secret. */
export const TRY_WITHDRAW_DEST = 'TR890009903460061605055303';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return trimSlash(fromEnv);
  if (__DEV__) return 'http://127.0.0.1:8787';
  throw new Error('EXPO_PUBLIC_API_BASE_URL is required outside development');
}

export function getOptionalAccountId(): string | undefined {
  return optionalGAddress(process.env.EXPO_PUBLIC_ACCOUNT_ID);
}

export function getPayRecipient(): string | undefined {
  return optionalGAddress(process.env.EXPO_PUBLIC_PAY_RECIPIENT);
}
