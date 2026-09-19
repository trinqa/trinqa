import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { DeterministicRiskEngine } from '../../src/services/deterministic-risk-engine.js';

describe('DefindexYieldAdapter.normalizeStrategy', () => {
  it('keeps intrinsic strategy risk independent of user riskProfile', async () => {
    const adapter = new DefindexYieldAdapter({
      ...env,
      DEFINDEX_API_KEY: 'test-key',
      DEFINDEX_VAULT_ADDRESS: 'CVAULT1234567890123456789012345678901234567890123456789012',
    });

    vi.spyOn(adapter, 'getVaultInfo').mockResolvedValue({
      name: 'Stable USDC Vault',
      assets: [{ code: 'USDC' }],
    } as never);
    vi.spyOn(adapter, 'getVaultAPY').mockResolvedValue(6);

    const strategy = await adapter.normalizeStrategy();
    expect(strategy?.risk).toBe('conservative');

    const engine = new DeterministicRiskEngine();
    const lowProfile = engine.scoreStrategy({ riskProfile: 0, daysToTarget: 30, strategy: strategy! });
    const highProfile = engine.scoreStrategy({ riskProfile: 2, daysToTarget: 30, strategy: strategy! });
    expect(lowProfile.breakdown.safety).toBe(highProfile.breakdown.safety);
    expect(highProfile.breakdown.assetRisk).not.toBe(lowProfile.breakdown.assetRisk);
  });
});

describe('DefindexYieldAdapter.normalizePosition', () => {
  const vault = 'CVAULT1234567890123456789012345678901234567890123456789012';

  function adapterWithBalance(balance: unknown) {
    const adapter = new DefindexYieldAdapter({ ...env, DEFINDEX_API_KEY: 'test-key', DEFINDEX_VAULT_ADDRESS: vault });
    vi.spyOn(adapter, 'getVaultInfo').mockResolvedValue({
      assets: [{ address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', symbol: 'USDC' }],
    } as never);
    vi.spyOn(adapter as never, 'usdcUnderlyingIndex').mockReturnValue(0 as never);
    vi.spyOn(adapter, 'getVaultBalance').mockResolvedValue(balance as never);
    return adapter;
  }

  it('reads DeFindex balances as atomic integer strings (live API shape)', async () => {
    const pos = await adapterWithBalance({ dfTokens: '5000001', underlyingBalance: ['5000001'] }).normalizePosition(
      'G'.repeat(56),
      `defindex:${vault}`,
    );
    expect(pos?.positionValue.amount).toBe('0.5000001');
    expect(pos?.shares).toBe('5000001');
  });

  it('treats an empty position as no position', async () => {
    const pos = await adapterWithBalance({ dfTokens: '0', underlyingBalance: ['0'] }).normalizePosition(
      'G'.repeat(56),
      `defindex:${vault}`,
    );
    expect(pos).toBeNull();
  });

  it('rejects non-integer atomic amounts instead of guessing units', async () => {
    await expect(
      adapterWithBalance({ dfTokens: '1', underlyingBalance: ['0.5'] }).normalizePosition(
        'G'.repeat(56),
        `defindex:${vault}`,
      ),
    ).rejects.toMatchObject({ code: 'ADAPTER_UNAVAILABLE' });
  });
});
