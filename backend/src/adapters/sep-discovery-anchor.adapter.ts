import TOML from 'toml';
import type { DecimalString } from '../domain/money.js';
import type {
  AnchorAdapter,
  AnchorAssetRail,
  AnchorSep,
  AnchorSnapshot,
  AnchorStatus,
  IndicativePrice,
  IndicativePriceRequest,
  RailDirection,
} from '../domain/anchor.js';

/**
 * Read-only SEP discovery adapter for any Stellar anchor home domain.
 *
 * Unlike `TrMockAnchorAdapter` (which we execute against), this adapter never signs, never
 * authenticates, and never moves money — it only reads SEP-1/SEP-6/SEP-38 public endpoints to
 * build an honest `AnchorSnapshot` for the anchor directory and route filtering.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;
/** An unreachable anchor is re-probed sooner, so one network blip does not stick for the full TTL. */
const FAILURE_TTL_MS = 30 * 1000;
const FETCH_TIMEOUT_MS = 8000;

type RawSep6AssetInfo = {
  enabled?: boolean;
  min_amount?: number | string;
  max_amount?: number | string;
  fee_fixed?: number | string;
  fee_percent?: number | string;
  funding_methods?: string[];
  types?: Record<string, unknown>;
  fields?: { type?: { choices?: string[] } };
};

type RawSep6Info = {
  deposit?: Record<string, RawSep6AssetInfo>;
  withdraw?: Record<string, RawSep6AssetInfo>;
};

type RawSep38Asset = { asset?: string };

type RawCurrency = {
  code?: string;
  issuer?: string;
  anchor_asset_type?: string;
  anchor_asset?: string;
};

type ParsedToml = {
  name: string;
  network: 'testnet' | 'mainnet';
  transferServer?: string;
  transferServerSep24?: string;
  webAuthEndpoint?: string;
  kycServer?: string;
  anchorQuoteServer?: string;
  directPaymentServer?: string;
  currencies: RawCurrency[];
};

export interface SepDiscoveryAnchorAdapterOptions {
  /** Injectable fetch for tests; defaults to global `fetch`. */
  fetchFn?: typeof fetch;
  /** Injectable clock for cache tests; defaults to `Date.now`. */
  now?: () => number;
  /** Cache TTL override for tests; defaults to 5 minutes. */
  ttlMs?: number;
}

function toDecimalStringOrUndefined(value: number | string | undefined): DecimalString | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function detectNetwork(passphrase: string | undefined): 'testnet' | 'mainnet' {
  if (!passphrase) return 'testnet';
  return passphrase.includes('Test SDF') ? 'testnet' : 'mainnet';
}

function fiatFromCurrencies(currencies: RawCurrency[], assetCode: string): string[] {
  const match = currencies.find(
    (c) => c.code === assetCode && c.anchor_asset_type === 'fiat' && typeof c.anchor_asset === 'string',
  );
  return match?.anchor_asset ? [match.anchor_asset] : [];
}

function describeProbeFailure(status: number): string {
  if (status === 401 || status === 403) return 'SEP-38 /price requires authentication';
  if (status === 404) return 'SEP-38 /price not found';
  if (status === 0) return 'SEP-38 /price unreachable';
  return `SEP-38 /price failed (${status})`;
}

export class SepDiscoveryAnchorAdapter implements AnchorAdapter {
  readonly id: string;
  readonly domain: string;

  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly ttlMs: number;

  private tomlCache?: { value: ParsedToml | null; at: number };
  private snapshotCache?: { value: AnchorSnapshot; at: number };

  constructor(domain: string, opts: SepDiscoveryAnchorAdapterOptions = {}) {
    this.domain = domain;
    this.id = domain;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  }

  tomlUrl(): string {
    return `https://${this.domain}/.well-known/stellar.toml`;
  }

  async snapshot(): Promise<AnchorSnapshot> {
    if (this.snapshotCache && this.now() - this.snapshotCache.at < this.cacheTtl(this.snapshotCache.value.healthy)) {
      return this.snapshotCache.value;
    }
    const value = await this.buildSnapshot();
    this.snapshotCache = { value, at: this.now() };
    return value;
  }

  async indicativePrice(req: IndicativePriceRequest): Promise<IndicativePrice | null> {
    const toml = await this.getToml();
    if (!toml?.anchorQuoteServer) return null;

    const qs = new URLSearchParams({
      sell_asset: req.sellAsset,
      buy_asset: req.buyAsset,
      sell_amount: req.sellAmount,
      context: 'sep6',
    });
    const result = await this.fetchPriceRaw(`${toml.anchorQuoteServer}/price?${qs.toString()}`);
    if (!result.ok || !result.body) return null;

    const body = result.body as {
      price?: unknown;
      buy_amount?: unknown;
      fee?: { total?: unknown; asset?: unknown };
    };
    if (body.price === undefined || body.buy_amount === undefined) return null;

    return {
      anchorId: this.id,
      sellAsset: req.sellAsset,
      buyAsset: req.buyAsset,
      sellAmount: req.sellAmount,
      buyAmount: String(body.buy_amount),
      price: String(body.price),
      fee:
        body.fee?.total !== undefined && body.fee?.asset !== undefined
          ? { total: String(body.fee.total), asset: String(body.fee.asset) }
          : undefined,
      firm: false,
      source: 'sep38_price',
    };
  }

  private cacheTtl(ok: boolean): number {
    return ok ? this.ttlMs : Math.min(this.ttlMs, FAILURE_TTL_MS);
  }

  private async getToml(): Promise<ParsedToml | null> {
    if (this.tomlCache && this.now() - this.tomlCache.at < this.cacheTtl(this.tomlCache.value !== null)) {
      return this.tomlCache.value;
    }
    let value: ParsedToml | null;
    try {
      // One retry: anchors' stellar.toml hosts occasionally drop a connection.
      const raw = await this.fetchText(this.tomlUrl()).catch(() => this.fetchText(this.tomlUrl()));
      const parsed = TOML.parse(raw) as Record<string, unknown>;
      const documentation = parsed.DOCUMENTATION as Record<string, unknown> | undefined;
      value = {
        name: (documentation?.ORG_NAME as string | undefined) ?? this.domain,
        network: detectNetwork(parsed.NETWORK_PASSPHRASE as string | undefined),
        transferServer: parsed.TRANSFER_SERVER as string | undefined,
        transferServerSep24: parsed.TRANSFER_SERVER_SEP0024 as string | undefined,
        webAuthEndpoint: parsed.WEB_AUTH_ENDPOINT as string | undefined,
        kycServer: parsed.KYC_SERVER as string | undefined,
        anchorQuoteServer: parsed.ANCHOR_QUOTE_SERVER as string | undefined,
        directPaymentServer: parsed.DIRECT_PAYMENT_SERVER as string | undefined,
        currencies: (parsed.CURRENCIES as RawCurrency[] | undefined) ?? [],
      };
    } catch {
      value = null;
    }
    this.tomlCache = { value, at: this.now() };
    return value;
  }

  private async buildSnapshot(): Promise<AnchorSnapshot> {
    const fetchedAt = new Date(this.now()).toISOString();
    const toml = await this.getToml();

    if (!toml) {
      return {
        id: this.id,
        domain: this.domain,
        name: this.domain,
        status: 'UNAVAILABLE',
        statusReason: 'stellar.toml unreachable',
        seps: [],
        rails: [],
        healthy: false,
        network: 'testnet',
        fetchedAt,
      };
    }

    const seps: AnchorSep[] = ['sep1'];
    if (toml.transferServer) seps.push('sep6');
    if (toml.transferServerSep24) seps.push('sep24');
    if (toml.webAuthEndpoint) seps.push('sep10');
    if (toml.kycServer) seps.push('sep12');
    if (toml.anchorQuoteServer) seps.push('sep38');
    if (toml.directPaymentServer) seps.push('sep31');

    if (!toml.transferServer) {
      const statusReason = toml.transferServerSep24
        ? "SEP-24 only; Trinqa's flow needs SEP-6"
        : "No SEP-6 transfer server published; Trinqa's flow needs SEP-6";
      return {
        id: this.id,
        domain: this.domain,
        name: toml.name,
        status: 'UNAVAILABLE',
        statusReason,
        seps,
        rails: [],
        healthy: true,
        network: toml.network,
        fetchedAt,
      };
    }

    let sep6Info: RawSep6Info;
    try {
      sep6Info = (await this.fetchJson(`${toml.transferServer}/info`)) as RawSep6Info;
    } catch {
      return {
        id: this.id,
        domain: this.domain,
        name: toml.name,
        status: 'UNAVAILABLE',
        statusReason: 'SEP-6 /info unreachable',
        seps,
        rails: [],
        healthy: false,
        network: toml.network,
        fetchedAt,
      };
    }

    let sep38Fiat: string[] | undefined;
    if (toml.anchorQuoteServer) {
      try {
        const info = (await this.fetchJson(`${toml.anchorQuoteServer}/info`)) as { assets?: RawSep38Asset[] };
        sep38Fiat = (info.assets ?? [])
          .map((a) => a.asset)
          .filter((a): a is string => typeof a === 'string' && a.startsWith('iso4217:'))
          .map((a) => a.slice('iso4217:'.length));
      } catch {
        sep38Fiat = undefined;
      }
    }

    const rails = this.buildRails(sep6Info, toml.currencies, sep38Fiat);

    let status: AnchorStatus = 'DISCOVERY_ONLY';
    let statusReason: string | undefined;

    if (!toml.anchorQuoteServer) {
      statusReason = 'No SEP-38 endpoint; indicative pricing unavailable';
    } else {
      // Probe with the USDC rail: it is what Trinqa settles, and pairing another asset code
      // with the USDC issuer names an asset that does not exist (testanchor lists SRT first).
      const probeRail = rails.find((r) => r.assetCode === 'USDC' && r.fiat.length > 0);
      const usdcIssuer = probeRail?.assetIssuer ?? toml.currencies.find((c) => c.code === 'USDC')?.issuer;
      if (probeRail && probeRail.fiat[0] && usdcIssuer) {
        const qs = new URLSearchParams({
          sell_asset: `iso4217:${probeRail.fiat[0]}`,
          buy_asset: `stellar:USDC:${usdcIssuer}`,
          sell_amount: '100',
          context: 'sep6',
        });
        const probe = await this.fetchPriceRaw(`${toml.anchorQuoteServer}/price?${qs.toString()}`);
        if (probe.ok) {
          status = 'QUOTE_ONLY';
        } else {
          status = 'DISCOVERY_ONLY';
          statusReason = describeProbeFailure(probe.status);
        }
      } else {
        statusReason = 'SEP-38 present but no fiat/asset pair available to probe price';
      }
    }

    return {
      id: this.id,
      domain: this.domain,
      name: toml.name,
      status,
      statusReason,
      seps,
      rails,
      healthy: true,
      network: toml.network,
      fetchedAt,
    };
  }

  private buildRails(
    sep6Info: RawSep6Info,
    currencies: RawCurrency[],
    sep38Fiat: string[] | undefined,
  ): AnchorAssetRail[] {
    const rails: AnchorAssetRail[] = [];
    const directions: RailDirection[] = ['deposit', 'withdraw'];
    for (const direction of directions) {
      const entries = sep6Info[direction] ?? {};
      for (const [assetCode, raw] of Object.entries(entries)) {
        const fiat = sep38Fiat ?? fiatFromCurrencies(currencies, assetCode);
        const methods =
          raw?.funding_methods ??
          (raw?.types ? Object.keys(raw.types) : undefined) ??
          raw?.fields?.type?.choices ??
          [];
        rails.push({
          assetCode,
          assetIssuer: currencies.find((c) => c.code === assetCode)?.issuer,
          direction,
          enabled: Boolean(raw?.enabled),
          fiat,
          min: toDecimalStringOrUndefined(raw?.min_amount),
          max: toDecimalStringOrUndefined(raw?.max_amount),
          feeFixed: toDecimalStringOrUndefined(raw?.fee_fixed),
          feePercent: toDecimalStringOrUndefined(raw?.fee_percent),
          methods,
        });
      }
    }
    return rails;
  }

  private async doFetch(url: string): Promise<Response> {
    return this.fetchFn(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  }

  private async fetchText(url: string): Promise<string> {
    const res = await this.doFetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.text();
  }

  private async fetchJson(url: string): Promise<unknown> {
    const res = await this.doFetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
  }

  private async fetchPriceRaw(url: string): Promise<{ ok: boolean; status: number; body: unknown }> {
    try {
      const res = await this.doFetch(url);
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, status: res.status, body };
    } catch {
      return { ok: false, status: 0, body: undefined };
    }
  }
}
