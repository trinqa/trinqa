import { describe, expect, it } from 'vitest';
import TOML from 'toml';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { env } from '../../src/config/env.js';

describe('TrMockAnchorAdapter (SEP-1 parse)', () => {
  it('parses stellar.toml fields from fixture', () => {
    const sample = `
VERSION="2.7.0"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SIGNING_KEY="GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M"
WEB_AUTH_ENDPOINT="https://tr-mock-anchor.fly.dev/auth"
TRANSFER_SERVER="https://tr-mock-anchor.fly.dev/sep6"
KYC_SERVER="https://tr-mock-anchor.fly.dev/sep12"
ANCHOR_QUOTE_SERVER="https://tr-mock-anchor.fly.dev/sep38"

[[CURRENCIES]]
code="USDC"
issuer="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
`;
    const parsed = TOML.parse(sample) as Record<string, unknown>;
    expect(parsed.TRANSFER_SERVER).toContain('/sep6');
    expect(parsed.WEB_AUTH_ENDPOINT).toContain('/auth');
  });

  it('live discover hits TR mock anchor', async () => {
    const adapter = new TrMockAnchorAdapter(env, env.STELLAR_PASSPHRASE);
    const toml = await adapter.discover();
    expect(toml.transferServer).toContain('sep6');
    expect(toml.webAuthEndpoint).toContain('auth');
    expect(toml.usdcIssuer).toBe(env.USDC_ISSUER);
  });
});
