import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { getTrinqaUsdcIdentity } from '../../src/domain/trinqa-usdc.js';

describe('getTrinqaUsdcIdentity', () => {
  it('returns stable mock-anchor USDC SAC on testnet', () => {
    const id = getTrinqaUsdcIdentity(env);
    expect(id.code).toBe('USDC');
    expect(id.issuer).toBe(env.USDC_ISSUER);
    expect(id.sacContractId).toMatch(/^C[A-Z0-9]{55}$/);
    expect(id.decimals).toBe(7);
    expect(id.sacContractId).toBe('CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA');
  });
});
