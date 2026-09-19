import { getOptionalAccountId } from '@/config/env';
import { api, setWalletKey } from '@/services/api';
import { BackendApiError } from '@/services/apiErrors';
import { loadWalletKey, saveWalletKey } from '@/services/walletStore';
import type { BackendCapabilities } from '@/services/types';

/**
 * Who signs for this account. Flows only ask for the account and a signature;
 * today the backend holds a per-device testnet key, later a passkey smart wallet
 * can implement the same interface without touching them.
 */
export interface Signer {
  readonly kind: 'custodial' | 'env-demo';
  readonly accountId: string;
  signXdr(unsignedXdr: string): Promise<string>;
}

let active: Signer | null = null;

function backendSigner(kind: Signer['kind'], accountId: string): Signer {
  return {
    kind,
    accountId,
    async signXdr(unsignedXdr) {
      const { signedXdr } = await api.demoSign(unsignedXdr);
      return signedXdr;
    },
  };
}

/** A device wallet created (or restored) on the backend: funded, with a USDC trustline. */
async function custodialSigner(): Promise<Signer> {
  const stored = loadWalletKey();
  const wallet = await api.demoWallet(stored ?? undefined);
  if (wallet.walletKey !== stored) saveWalletKey(wallet.walletKey);
  setWalletKey(wallet.walletKey);
  return backendSigner('custodial', wallet.account);
}

export function hasStoredWallet(): boolean {
  return loadWalletKey() !== null;
}

export async function connectSigner(capabilities: BackendCapabilities): Promise<Signer> {
  const fromEnv = getOptionalAccountId();
  if (fromEnv) {
    active = backendSigner('env-demo', fromEnv);
  } else if (capabilities.features.demoSigner) {
    active = await custodialSigner();
  } else {
    throw new BackendApiError(
      'ACCOUNT_UNCONFIGURED',
      'Set EXPO_PUBLIC_ACCOUNT_ID or enable the backend demo signer.',
      503,
    );
  }
  return active;
}

export function currentSigner(): Signer {
  if (!active) throw new BackendApiError('ACCOUNT_UNCONFIGURED', 'No account is connected yet.', 503);
  return active;
}
