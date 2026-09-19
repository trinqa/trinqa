import { ApiError } from './api-errors.js';
import { fromAtomic } from './money.js';

/**
 * DeFindex API balances arrive as atomic-unit integers (usually strings, e.g. "5000001" = 0.5000001 USDC),
 * despite the SDK typing them as numbers. Anything that is not a non-negative integer is rejected.
 */
export function providerAtomicToDecimalString(value: unknown, decimals = 7, label = 'amount'): string {
  const raw = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof raw !== 'string' && typeof raw !== 'bigint') {
    throw new ApiError('ADAPTER_UNAVAILABLE', `Invalid ${label} from provider`, 502);
  }
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) {
    throw new ApiError('ADAPTER_UNAVAILABLE', `Invalid ${label} from provider`, 502);
  }
  return fromAtomic(BigInt(text), decimals);
}
