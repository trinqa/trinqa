import { describe, expect, it } from 'vitest';
import { SepDiscoveryAnchorAdapter } from '../../src/adapters/sep-discovery-anchor.adapter.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { env } from '../../src/config/env.js';

describe('Anchor discovery integration (live, public endpoints only)', () => {
  it('testanchor.stellar.org publishes SEP-6 + SEP-38 with a USDC rail', async () => {
    const adapter = new SepDiscoveryAnchorAdapter('testanchor.stellar.org');
    const snapshot = await adapter.snapshot();

    expect(snapshot.seps).toContain('sep6');
    expect(snapshot.seps).toContain('sep38');
    expect(snapshot.healthy).toBe(true);

    const usdcRail = snapshot.rails.find((r) => r.assetCode === 'USDC');
    expect(usdcRail).toBeDefined();

    // Not our anchor: it is at best QUOTE_ONLY or DISCOVERY_ONLY, never EXECUTABLE.
    expect(snapshot.status).not.toBe('EXECUTABLE');
    expect(['QUOTE_ONLY', 'DISCOVERY_ONLY']).toContain(snapshot.status);
  });

  it('extstellar.moneygram.com is UNAVAILABLE for lacking SEP-6', async () => {
    const adapter = new SepDiscoveryAnchorAdapter('extstellar.moneygram.com');
    const snapshot = await adapter.snapshot();

    expect(snapshot.status).toBe('UNAVAILABLE');
    expect(snapshot.statusReason).toMatch(/SEP-6/i);
    expect(snapshot.seps).not.toContain('sep6');
  });

  it('tr-mock-anchor.fly.dev snapshot is EXECUTABLE with a TRY withdraw rail', async () => {
    const anchor = new TrMockAnchorAdapter(env, env.STELLAR_PASSPHRASE);
    const snapshot = await anchor.snapshot();

    expect(snapshot.status).toBe('EXECUTABLE');
    expect(snapshot.healthy).toBe(true);

    const withdraw = snapshot.rails.find((r) => r.assetCode === 'USDC' && r.direction === 'withdraw');
    expect(withdraw).toBeDefined();
    expect(withdraw?.fiat).toContain('TRY');
  });
});
