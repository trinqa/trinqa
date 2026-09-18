import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// CJS entry avoids ESM default-import typing issues under NodeNext.
const Decimal = require('decimal.js') as typeof import('decimal.js').default;

export { Decimal };

/** Stellar classic assets use 7 decimal places max. */
export const STELLAR_MAX_DECIMALS = 7;

/** TRY display / anchor fiat convention. */
export const TRY_DECIMALS = 2;

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DecimalString = string;

export function assertDecimalString(value: string, label: string): void {
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${label} must be a decimal string, got: ${value}`);
  }
}

/** Parse human decimal → atomic bigint (no float). */
export function toAtomic(value: DecimalString, decimals: number): bigint {
  assertDecimalString(value, 'amount');
  const d = new Decimal(value);
  if (!d.isFinite()) {
    throw new Error(`Invalid amount: ${value}`);
  }
  const factor = new Decimal(10).pow(decimals);
  const atomic = d.mul(factor).toFixed(0, Decimal.ROUND_HALF_UP);
  return BigInt(atomic);
}

/** Atomic bigint → fixed-width decimal string. */
export function fromAtomic(atomic: bigint, decimals: number): DecimalString {
  const negative = atomic < 0n;
  const abs = negative ? -atomic : atomic;
  const s = abs.toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, -decimals) || '0';
  const frac = s.slice(-decimals).replace(/0+$/, '');
  const body = frac.length > 0 ? `${whole}.${frac}` : whole;
  return negative ? `-${body}` : body;
}

export function formatStellarAmount(value: DecimalString): DecimalString {
  const d = new Decimal(value);
  return d.toFixed(Math.min(STELLAR_MAX_DECIMALS, d.decimalPlaces()), Decimal.ROUND_HALF_UP);
}

export function formatTryAmount(value: DecimalString): DecimalString {
  return new Decimal(value).toFixed(TRY_DECIMALS, Decimal.ROUND_HALF_UP);
}
