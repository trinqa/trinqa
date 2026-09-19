import { ApiError } from './api-errors.js';

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const MIN = BigInt(Number.MIN_SAFE_INTEGER);

/** DeFindex/Soroswap SDK paths still use number[] — convert bigint atomics safely. */
export function bigintToSafeNumber(value: bigint, label = 'amount'): number {
  if (value > MAX || value < MIN) {
    throw new ApiError('VALIDATION_ERROR', `${label} exceeds safe JavaScript integer range`, 422, {
      maxSafe: Number.MAX_SAFE_INTEGER.toString(),
    });
  }
  return Number(value);
}
