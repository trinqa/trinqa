import { describe, expect, it, vi } from 'vitest';
import { SepDiscoveryAnchorAdapter } from '../../src/adapters/sep-discovery-anchor.adapter.js';

/** SEP-6 + SEP-38 anchor (modelled on testanchor.stellar.org). */
const SEP6_SEP38_TOML = `
VERSION = "0.1.0"
SIGNING_KEY = "GCHLHDBOKG2JWMJQBTLSL5XG6NO7ESXI2TAQKZXCXWXB5WI2X6W233PR"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
WEB_AUTH_ENDPOINT = "https://good-anchor.test/auth"
KYC_SERVER = "https://good-anchor.test/sep12"
TRANSFER_SERVER = "https://good-anchor.test/sep6"
ANCHOR_QUOTE_SERVER = "https://good-anchor.test/sep38"

[[CURRENCIES]]
code = "USDC"
issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
status = "test"
anchor_asset_type = "crypto"

[DOCUMENTATION]
ORG_NAME = "Good Anchor"
`;

const SEP6_INFO = {
  deposit: {
    USDC: {
      enabled: true,
      min_amount: 1,
      max_amount: 10000,
      funding_methods: ['SEPA', 'SWIFT'],
    },
  },
  withdraw: {
    USDC: {
      enabled: true,
      fee_percent: 0.5,
      funding_methods: ['bank_account', 'cash'],
      types: { cash: { fields: {} }, bank_account: { fields: {} } },
    },
  },
};

const SEP38_INFO = {
  assets: [
    { asset: 'stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
    { asset: 'iso4217:USD' },
    { asset: 'iso4217:CAD' },
  ],
};

/** SEP-24-only anchor (modelled on extstellar.moneygram.com): no TRANSFER_SERVER. */
const SEP24_ONLY_TOML = `
VERSION = "0.1.0"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
SIGNING_KEY = "GCSESAP5ILVM6CWIEGK2SDOCQU7PHVFYYT7JNKRDAQNVQWKD5YEE5ZJ4"
WEB_AUTH_ENDPOINT = "https://sep24-only.test/auth"
TRANSFER_SERVER_SEP0024 = "https://sep24-only.test/sep24"

[[CURRENCIES]]
code = "USDC"
issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
anchor_asset_type = "fiat"
anchor_asset = "USD"

[DOCUMENTATION]
ORG_NAME = "MoneyGram"
`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

describe('SepDiscoveryAnchorAdapter', () => {
  it('detects SEPs, normalizes rails, and resolves fiat from SEP-38 info', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/stellar.toml')) return textResponse(SEP6_SEP38_TOML);
      if (url === 'https://good-anchor.test/sep6/info') return jsonResponse(SEP6_INFO);
      if (url === 'https://good-anchor.test/sep38/info') return jsonResponse(SEP38_INFO);
      if (url.startsWith('https://good-anchor.test/sep38/price')) {
        return jsonResponse({ price: '1.02', buy_amount: '97.05', sell_amount: '100' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const adapter = new SepDiscoveryAnchorAdapter('good-anchor.test', { fetchFn: fetchFn as unknown as typeof fetch });
    const snapshot = await adapter.snapshot();

    expect(snapshot.id).toBe('good-anchor.test');
    expect(snapshot.domain).toBe('good-anchor.test');
    expect(snapshot.name).toBe('Good Anchor');
    expect(snapshot.network).toBe('testnet');
    expect(snapshot.healthy).toBe(true);
    expect(snapshot.seps.sort()).toEqual(['sep1', 'sep10', 'sep12', 'sep38', 'sep6'].sort());

    expect(snapshot.rails).toHaveLength(2);
    const deposit = snapshot.rails.find((r) => r.direction === 'deposit');
    const withdraw = snapshot.rails.find((r) => r.direction === 'withdraw');

    expect(deposit).toMatchObject({
      assetCode: 'USDC',
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      enabled: true,
      min: '1',
      max: '10000',
      methods: ['SEPA', 'SWIFT'],
    });
    // Limits/fees must be normalized to DecimalString, never floats.
    expect(typeof deposit?.min).toBe('string');
    expect(typeof deposit?.max).toBe('string');

    expect(withdraw).toMatchObject({
      assetCode: 'USDC',
      enabled: true,
      feePercent: '0.5',
    });
    expect(withdraw?.methods.sort()).toEqual(['bank_account', 'cash'].sort());

    // Fiat comes from SEP-38 /info's iso4217 assets, not stellar.toml CURRENCIES.
    expect(deposit?.fiat.sort()).toEqual(['CAD', 'USD'].sort());
    expect(withdraw?.fiat.sort()).toEqual(['CAD', 'USD'].sort());

    // sep6 + sep38 + a working unauthenticated /price probe => QUOTE_ONLY.
    expect(snapshot.status).toBe('QUOTE_ONLY');
  });

  it('flags a SEP-24-only anchor as UNAVAILABLE with an explanatory reason', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/stellar.toml')) return textResponse(SEP24_ONLY_TOML);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const adapter = new SepDiscoveryAnchorAdapter('sep24-only.test', { fetchFn: fetchFn as unknown as typeof fetch });
    const snapshot = await adapter.snapshot();

    expect(snapshot.status).toBe('UNAVAILABLE');
    expect(snapshot.statusReason).toMatch(/SEP-24 only/i);
    expect(snapshot.rails).toEqual([]);
    expect(snapshot.seps).toContain('sep24');
    expect(snapshot.seps).not.toContain('sep6');
    // toml loaded fine, so this counts as healthy even though it's not executable for us.
    expect(snapshot.healthy).toBe(true);
  });

  it('returns DISCOVERY_ONLY when SEP-38 /price requires auth, and indicativePrice resolves null', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/stellar.toml')) return textResponse(SEP6_SEP38_TOML);
      if (url === 'https://good-anchor.test/sep6/info') return jsonResponse(SEP6_INFO);
      if (url === 'https://good-anchor.test/sep38/info') return jsonResponse(SEP38_INFO);
      if (url.startsWith('https://good-anchor.test/sep38/price')) {
        return jsonResponse({ error: 'authentication required' }, 401);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const adapter = new SepDiscoveryAnchorAdapter('good-anchor.test', { fetchFn: fetchFn as unknown as typeof fetch });
    const snapshot = await adapter.snapshot();

    expect(snapshot.status).toBe('DISCOVERY_ONLY');
    expect(snapshot.statusReason).toMatch(/authentication/i);

    const price = await adapter.indicativePrice({
      sellAsset: 'iso4217:USD',
      buyAsset: 'stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      sellAmount: '100',
    });
    expect(price).toBeNull();
  });

  it('returns UNAVAILABLE with a plain-words reason when stellar.toml is unreachable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network unreachable');
    });

    const adapter = new SepDiscoveryAnchorAdapter('down-anchor.test', { fetchFn: fetchFn as unknown as typeof fetch });
    const snapshot = await adapter.snapshot();

    expect(snapshot.status).toBe('UNAVAILABLE');
    expect(snapshot.statusReason).toBe('stellar.toml unreachable');
    expect(snapshot.healthy).toBe(false);
    expect(snapshot.seps).toEqual([]);
  });

  it('caches the snapshot for the configured TTL and refetches once it expires', async () => {
    let now = 1_000_000;
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/stellar.toml')) return textResponse(SEP24_ONLY_TOML);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const adapter = new SepDiscoveryAnchorAdapter('sep24-only.test', {
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => now,
      ttlMs: 1000,
    });

    await adapter.snapshot();
    const tomlCallsAfterFirst = fetchFn.mock.calls.length;

    now += 500; // still within TTL
    await adapter.snapshot();
    expect(fetchFn.mock.calls.length).toBe(tomlCallsAfterFirst);

    now += 1000; // past TTL
    await adapter.snapshot();
    expect(fetchFn.mock.calls.length).toBeGreaterThan(tomlCallsAfterFirst);
  });

  it('resolves an indicative price for an anchor with an open SEP-38 /price endpoint', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/stellar.toml')) return textResponse(SEP6_SEP38_TOML);
      if (url.startsWith('https://good-anchor.test/sep38/price')) {
        return jsonResponse({ price: '1.02', buy_amount: '97.05', fee: { total: '1.00', asset: 'iso4217:USD' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const adapter = new SepDiscoveryAnchorAdapter('good-anchor.test', { fetchFn: fetchFn as unknown as typeof fetch });
    const price = await adapter.indicativePrice({
      sellAsset: 'iso4217:USD',
      buyAsset: 'stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      sellAmount: '100',
    });

    expect(price).toMatchObject({
      anchorId: 'good-anchor.test',
      buyAmount: '97.05',
      price: '1.02',
      firm: false,
      source: 'sep38_price',
      fee: { total: '1.00', asset: 'iso4217:USD' },
    });
  });
});
