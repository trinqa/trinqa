import { describe, expect, it } from 'vitest';
import { fromAtomic, toAtomic, formatTryAmount } from '../../src/domain/money.js';

describe('money helpers', () => {
  it('converts decimal to atomic without float error', () => {
    expect(toAtomic('1.0000001', 7)).toBe(10_000_001n);
    expect(fromAtomic(10_000_001n, 7)).toBe('1.0000001');
  });

  it('formats TRY to 2dp', () => {
    expect(formatTryAmount('1000.5')).toBe('1000.50');
  });
});
