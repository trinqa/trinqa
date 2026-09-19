import { ApiError } from './api-errors.js';
import { Decimal, fromAtomic, toAtomic } from './money.js';
import { bigintToSafeNumber } from './safe-integer.js';

/** Convert DeFindex SDK number balances to 7-decimal Stellar amounts without unsafe BigInt truncation. */
export function providerNumberToDecimalString(value: number, decimals = 7, label = 'amount'): string {
  if (!Number.isFinite(value)) {
    throw new ApiError('ADAPTER_UNAVAILABLE', `Invalid ${label} from provider`, 502);
  }
  const asDecimal = new Decimal(String(value));
  const atomic = toAtomic(asDecimal.toFixed(decimals), decimals);
  try {
    bigintToSafeNumber(atomic, label);
  } catch {
    throw new ApiError('VALIDATION_ERROR', `${label} exceeds safe integer range`, 422);
  }
  const scaled = asDecimal.mul(new Decimal(10).pow(decimals));
  if (!scaled.minus(scaled.trunc()).abs().lte(new Decimal(`1e-${decimals - 2}`))) {
    throw new ApiError('VALIDATION_ERROR', `${label} has unsupported fractional atomic units`, 422);
  }
  return fromAtomic(atomic, decimals);
}
