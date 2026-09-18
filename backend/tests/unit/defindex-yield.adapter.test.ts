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
