import type { FastifyRequest } from 'fastify';
import { ApiError } from '../../domain/api-errors.js';
import {
  CustodialWallets,
  isWalletKey,
  type AccountSigner,
} from '../../services/custodial-wallet.service.js';

/** Header carrying a device's custodial wallet key; absent = the shared env demo account. */
export const WALLET_KEY_HEADER = 'x-wallet-key';

/**
 * The signer a request acts as. `fallback` is the legacy escape hatch for clients that
 * predate per-device wallets; routes that must address a single device omit it so a
 * missing header fails instead of silently resolving to the shared demo account.
 */
export function signerForRequest(
  request: FastifyRequest,
  wallets: CustodialWallets | null,
  fallback?: () => AccountSigner,
): AccountSigner {
  const header = request.headers[WALLET_KEY_HEADER];
  if (header === undefined) {
    if (fallback) return fallback();
    throw new ApiError('VALIDATION_ERROR', `Missing ${WALLET_KEY_HEADER}`, 400);
  }
  if (!isWalletKey(header) || !wallets) {
    throw new ApiError('VALIDATION_ERROR', `Invalid ${WALLET_KEY_HEADER}`, 400);
  }
  return wallets.signerFor(header);
}
