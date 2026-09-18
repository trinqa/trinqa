import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Decimal = require('decimal.js') as typeof import('decimal.js').default;

export { Decimal };

/** Stellar classic assets use 7 decimal places max. */
export const STELLAR_MAX_DECIMALS = 7;

/** TRY display / anchor fiat convention. */
export const TRY_DECIMALS = 2;

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type DecimalString = string;

export class MoneyPrecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyPrecisionError';
  }
}

export function assertDecimalString(value: string, label: string): void {
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new MoneyPrecisionError(`${label} must be a decimal string, got: ${value}`);
  }
}

export function assertScale(value: DecimalString, decimals: number, label = 'amount'): void {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new MoneyPrecisionError(`${label}: decimals must be a non-negative integer`);
  }
  assertDecimalString(value, label);
  const parts = value.split('.');
  const frac = parts[1] ?? '';
  if (frac.length > decimals) {
    throw new MoneyPrecisionError(`${label} exceeds ${decimals} decimal places: ${value}`);
  }
}

/** Parse human decimal → atomic bigint (exact; never silently rounds). */
export function toAtomic(value: DecimalString, decimals: number): bigint {
  assertScale(value, decimals, 'amount');
  const d = new Decimal(value);
  if (!d.isFinite()) {
    throw new MoneyPrecisionError(`Invalid amount: ${value}`);
  }
  const factor = new Decimal(10).pow(decimals);
  const product = d.mul(factor);
  if (!product.isInteger()) {
    throw new MoneyPrecisionError(`Amount ${value} is not representable at ${decimals} decimals`);
  }
  return BigInt(product.toFixed(0));
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
