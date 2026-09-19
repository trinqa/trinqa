import { describe, expect, it } from 'vitest';
import { fromAtomic, toAtomic, formatTryAmount, MoneyPrecisionError } from '../../src/domain/money.js';
import { bigintToSafeNumber } from '../../src/domain/safe-integer.js';

describe('money helpers', () => {
  it('converts decimal to atomic without float error', () => {
    expect(toAtomic('1.0000001', 7)).toBe(10_000_001n);
    expect(fromAtomic(10_000_001n, 7)).toBe('1.0000001');
  });

  it('rejects excess decimal precision', () => {
    expect(() => toAtomic('1.00000001', 7)).toThrow(MoneyPrecisionError);
    expect(() => toAtomic('12.345', 2)).toThrow(MoneyPrecisionError);
  });

  it('formats TRY to 2dp', () => {
    expect(formatTryAmount('1000.5')).toBe('1000.50');
  });

  it('fromAtomic with zero decimals keeps the integer', () => {
    expect(fromAtomic(5_000_001n, 0)).toBe('5000001');
    expect(fromAtomic(0n, 0)).toBe('0');
    expect(fromAtomic(-7n, 0)).toBe('-7');
  });

  it('safe integer boundary', () => {
    expect(bigintToSafeNumber(100n)).toBe(100);
    expect(() => bigintToSafeNumber(BigInt(Number.MAX_SAFE_INTEGER) + 2n)).toThrow();
  });
});
