import { describe, expect, it, vi } from 'vitest';
import { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { env } from '../../src/config/env.js';

describe('SoroswapAdapter.buildFromQuote', () => {
  it('passes recipient as to on sdk.build', async () => {
    const adapter = new SoroswapAdapter(
      { ...env, SOROSWAP_API_KEY: 'test-key' },
      'Test SDF Network ; September 2015',
    );
    const build = vi.fn().mockResolvedValue({ xdr: 'AAAA', action: 'swap', description: 'swap' });
    const sdk = {
      build,
      getProtocols: vi.fn(),
    };
    Object.defineProperty(adapter, 'requireSdk', {
      value: () => sdk,
    });

    const quote = { assetIn: 'CIN', assetOut: 'COUT' } as never;
    const from = 'G'.repeat(56);
    const to = 'H'.repeat(56);
    await adapter.buildFromQuote(quote, from, to);
    expect(build).toHaveBeenCalledWith({ quote, from, to }, expect.anything());
  });
});
