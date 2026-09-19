import TOML from 'toml';
import {
  Keypair,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { AppConfig } from '../config/env.js';
import type { AnchorAdapter, AnchorAssetRail, AnchorSep, AnchorSnapshot, RailDirection } from '../domain/anchor.js';
import type { DecimalString } from '../domain/money.js';

export type AnchorToml = {
  domain: string;
  version?: string;
  networkPassphrase?: string;
  signingKey?: string;
  webAuthEndpoint?: string;
  transferServer?: string;
  kycServer?: string;
  anchorQuoteServer?: string;
  usdcIssuer?: string;
  /** DOCUMENTATION.ORG_NAME, when the anchor publishes one. */
  orgName?: string;
};

export type Sep10Token = {
  token: string;
};

export type Sep38QuoteRequest = {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
};

export type Sep38Quote = {
  id: string;
  price: string;
  buy_amount: string;
  sell_amount: string;
  expires_at: string;
  /** SEP-38 fee object; `total` is denominated in `asset`. */
  fee?: { total: string; asset: string; details?: unknown[] };
  [key: string]: unknown;
};

export type TransferLimits = { min?: string; max?: string };

/** Non-2xx response from the anchor; `reason` is the anchor's own error text when it sent one. */
export class AnchorRequestError extends Error {
  readonly reason: string;

  constructor(
    readonly operation: string,
    readonly status: number,
    body: string,
  ) {
    super(`${operation} failed (${status}): ${body.slice(0, 300)}`);
    this.name = 'AnchorRequestError';
    let reason = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === 'string') reason = parsed.error;
      else if (typeof parsed.message === 'string') reason = parsed.message;
    } catch {
      // plain-text body
    }
    this.reason = reason;
  }
}

type Sep6AssetInfo = {
  enabled?: boolean;
  min_amount?: number | string;
  max_amount?: number | string;
  fee_fixed?: number | string;
  fee_percent?: number | string;
  funding_methods?: string[];
  types?: Record<string, unknown>;
  fields?: { type?: { choices?: string[] } };
};

/** Anchor metadata (stellar.toml, /info) changes rarely; cache it instead of refetching per call. */
const METADATA_TTL_MS = 5 * 60 * 1000;

function toDecimalStringOrUndefined(value: number | string | undefined): DecimalString | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

/** Normalize SEP-6 /info deposit/withdraw maps into AnchorAssetRail[], same shape the SEP discovery adapter produces. */
function buildAssetRails(sep6Info: unknown, fiat: string[], assetIssuer?: string): AnchorAssetRail[] {
  const info = sep6Info as { deposit?: Record<string, Sep6AssetInfo>; withdraw?: Record<string, Sep6AssetInfo> };
  const rails: AnchorAssetRail[] = [];
  const directions: RailDirection[] = ['deposit', 'withdraw'];
  for (const direction of directions) {
    const entries = info[direction] ?? {};
    for (const [assetCode, raw] of Object.entries(entries)) {
      const methods =
        raw?.funding_methods ?? (raw?.types ? Object.keys(raw.types) : undefined) ?? raw?.fields?.type?.choices ?? [];
      rails.push({
        assetCode,
        assetIssuer,
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

export class TrMockAnchorAdapter implements AnchorAdapter {
  private tomlCache?: { value: AnchorToml; at: number };
  private sep6InfoCache?: { value: unknown; at: number };

  constructor(
    private readonly config: AppConfig,
    private readonly networkPassphrase: string,
  ) {}

  get id(): string {
    return this.config.TR_ANCHOR_DOMAIN;
  }

  get domain(): string {
    return this.config.TR_ANCHOR_DOMAIN;
  }

  /**
   * Executable snapshot for the anchor directory: this is the only adapter Trinqa can move
   * money through, so status is EXECUTABLE whenever discovery + SEP-6 info both succeed.
   * Never throws — failures degrade to an UNAVAILABLE snapshot.
   */
  async snapshot(): Promise<AnchorSnapshot> {
    const fetchedAt = new Date().toISOString();
    try {
      const toml = await this.discover();
      const sep6Info = await this.sep6Info();

      const seps: AnchorSep[] = ['sep1'];
      if (toml.transferServer) seps.push('sep6');
      if (toml.webAuthEndpoint) seps.push('sep10');
      if (toml.kycServer) seps.push('sep12');
      if (toml.anchorQuoteServer) seps.push('sep38');

      let fiat = ['TRY'];
      if (toml.anchorQuoteServer) {
        try {
          const sep38Info = (await this.sep38Info()) as { assets?: Array<{ asset?: string }> };
          const isoAssets = (sep38Info.assets ?? [])
            .map((a) => a.asset)
            .filter((a): a is string => typeof a === 'string' && a.startsWith('iso4217:'))
            .map((a) => a.slice('iso4217:'.length));
          if (isoAssets.length > 0) fiat = isoAssets;
        } catch {
          // fall back to the known TRY rail
        }
      }

      const rails = buildAssetRails(sep6Info, fiat, toml.usdcIssuer);
      const network = toml.networkPassphrase?.includes('Test SDF') ? 'testnet' : 'mainnet';

      return {
        id: this.id,
        domain: this.domain,
        name: toml.orgName ?? this.domain,
        status: 'EXECUTABLE',
        seps,
        rails,
        healthy: true,
        network,
        fetchedAt,
      };
    } catch (err) {
      return {
        id: this.id,
        domain: this.domain,
        name: this.domain,
        status: 'UNAVAILABLE',
        statusReason: err instanceof Error ? err.message : 'TR mock anchor unreachable',
        seps: [],
        rails: [],
        healthy: false,
        network: 'testnet',
        fetchedAt,
      };
    }
  }

  tomlUrl(): string {
    return `https://${this.domain}/.well-known/stellar.toml`;
  }

  async discover(): Promise<AnchorToml> {
    if (this.tomlCache && Date.now() - this.tomlCache.at < METADATA_TTL_MS) {
      return this.tomlCache.value;
    }
    const value = await this.fetchToml();
    this.tomlCache = { value, at: Date.now() };
    return value;
  }

  private async fetchToml(): Promise<AnchorToml> {
    const res = await fetch(this.tomlUrl());
    if (!res.ok) {
      throw new Error(`SEP-1 TOML fetch failed: ${res.status}`);
    }
    const raw = await res.text();
    const parsed = TOML.parse(raw) as Record<string, unknown>;
    const currencies = parsed.CURRENCIES as Array<{ code?: string; issuer?: string }> | undefined;
    const usdc = currencies?.find((c) => c.code === 'USDC');
    const documentation = parsed.DOCUMENTATION as Record<string, unknown> | undefined;

    return {
      domain: this.domain,
      version: parsed.VERSION as string | undefined,
      networkPassphrase: parsed.NETWORK_PASSPHRASE as string | undefined,
      signingKey: parsed.SIGNING_KEY as string | undefined,
      webAuthEndpoint: parsed.WEB_AUTH_ENDPOINT as string | undefined,
      transferServer: parsed.TRANSFER_SERVER as string | undefined,
      kycServer: parsed.KYC_SERVER as string | undefined,
      anchorQuoteServer: parsed.ANCHOR_QUOTE_SERVER as string | undefined,
      usdcIssuer: usdc?.issuer,
      orgName: documentation?.ORG_NAME as string | undefined,
    };
  }

  async health(): Promise<{ ok: boolean; body: unknown }> {
    const res = await fetch(`https://${this.domain}/health`);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  }

  async sep6Info(): Promise<unknown> {
    if (this.sep6InfoCache && Date.now() - this.sep6InfoCache.at < METADATA_TTL_MS) {
      return this.sep6InfoCache.value;
    }
    const toml = await this.discover();
    const base = toml.transferServer ?? `https://${this.domain}/sep6`;
    const res = await fetch(`${base}/info`);
    if (!res.ok) {
      throw new Error(`SEP-6 info failed: ${res.status}`);
    }
    const value = await res.json();
    this.sep6InfoCache = { value, at: Date.now() };
    return value;
  }

  /** SEP-6 withdraw min/max for an asset (asset units), as published in /info. */
  async withdrawLimits(assetCode = 'USDC'): Promise<TransferLimits> {
    const info = (await this.sep6Info()) as { withdraw?: Record<string, Sep6AssetInfo> };
    const asset = info.withdraw?.[assetCode];
    const str = (v: number | string | undefined) => (v === undefined ? undefined : String(v));
    return { min: str(asset?.min_amount), max: str(asset?.max_amount) };
  }

  async sep12Customer(token: string, account: string): Promise<unknown> {
    const toml = await this.discover();
    const base = toml.kycServer ?? `https://${this.domain}/sep12`;
    const res = await fetch(`${base}/customer?account=${encodeURIComponent(account)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-12 customer', res.status, err);
    }
    return res.json();
  }

  async sep12PutCustomer(
    token: string,
    account: string,
    fields: Record<string, string> = {},
  ): Promise<unknown> {
    const toml = await this.discover();
    const base = toml.kycServer ?? `https://${this.domain}/sep12`;
    const res = await fetch(`${base}/customer`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, ...fields }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-12 customer update', res.status, err);
    }
    return res.json();
  }

  async sep38Info(): Promise<unknown> {
    const toml = await this.discover();
    const base = toml.anchorQuoteServer ?? `https://${this.domain}/sep38`;
    const res = await fetch(`${base}/info`);
    if (!res.ok) {
      throw new Error(`SEP-38 info failed: ${res.status}`);
    }
    return res.json();
  }

  async sep38Quote(token: string, req: Sep38QuoteRequest): Promise<Sep38Quote> {
    const toml = await this.discover();
    const base = toml.anchorQuoteServer ?? `https://${this.domain}/sep38`;
    const buyAsset =
      req.buyAsset ||
      `stellar:USDC:${this.config.USDC_ISSUER}`;
    const res = await fetch(`${base}/quote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sell_asset: req.sellAsset,
        buy_asset: buyAsset,
        ...(req.sellAmount ? { sell_amount: req.sellAmount } : {}),
        ...(req.buyAmount ? { buy_amount: req.buyAmount } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-38 quote', res.status, err);
    }
    return res.json() as Promise<Sep38Quote>;
  }

  private async transferServerBase(): Promise<string> {
    const toml = await this.discover();
    return toml.transferServer ?? `https://${this.domain}/sep6`;
  }

  async sep6Deposit(
    token: string,
    params: {
      asset_code: string;
      account: string;
      amount: string;
      type?: string;
      quote_id?: string;
    },
  ): Promise<unknown> {
    const base = await this.transferServerBase();
    const qs = new URLSearchParams({
      asset_code: params.asset_code,
      account: params.account,
      amount: params.amount,
      type: params.type ?? 'bank_account',
    });
    if (params.quote_id) {
      qs.set('quote_id', params.quote_id);
    }
    const res = await fetch(`${base}/deposit?${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-6 deposit', res.status, err);
    }
    return res.json();
  }


  async sep6Withdraw(
    token: string,
    params: {
      asset_code: string;
      account: string;
      amount: string;
      dest: string;
      type?: string;
      dest_extra?: string;
      quote_id?: string;
    },
  ): Promise<unknown> {
    const base = await this.transferServerBase();
    const qs = new URLSearchParams({
      asset_code: params.asset_code,
      account: params.account,
      amount: params.amount,
      dest: params.dest,
      type: params.type ?? 'bank_account',
    });
    if (params.dest_extra) {
      qs.set('dest_extra', params.dest_extra);
    }
    if (params.quote_id) {
      qs.set('quote_id', params.quote_id);
    }
    const res = await fetch(`${base}/withdraw?${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-6 withdraw', res.status, err);
    }
    return res.json();
  }


  async sep6SimulateBankTransfer(token: string, transactionId: string): Promise<unknown> {
    const base = await this.transferServerBase();
    const res = await fetch(`${base}/tx/${encodeURIComponent(transactionId)}/simulate-bank-transfer`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-6 simulate bank transfer', res.status, err);
    }
    return res.json();
  }

  async sep6Transaction(token: string, id: string): Promise<unknown> {
    const base = await this.transferServerBase();
    const res = await fetch(`${base}/transaction?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new AnchorRequestError('SEP-6 transaction', res.status, err);
    }
    return res.json();
  }

  async sep10Challenge(account: string): Promise<{ transaction: string; networkPassphrase: string }> {
    const toml = await this.discover();
    const authBase = toml.webAuthEndpoint ?? `https://${this.domain}/auth`;
    const challengeRes = await fetch(`${authBase}?account=${encodeURIComponent(account)}`);
    if (!challengeRes.ok) {
      throw new Error(`SEP-10 challenge failed: ${challengeRes.status}`);
    }
    const { transaction } = (await challengeRes.json()) as { transaction: string };
    return { transaction, networkPassphrase: this.networkPassphrase };
  }

  async sep10TokenFromSignedTransaction(signedTransactionXdr: string): Promise<Sep10Token & { account: string }> {
    const toml = await this.discover();
    const authBase = toml.webAuthEndpoint ?? `https://${this.domain}/auth`;
    const tx = TransactionBuilder.fromXDR(signedTransactionXdr, this.networkPassphrase);
    if (!(tx instanceof Transaction)) {
      throw new Error('SEP-10 token requires a signed transaction envelope');
    }
    // SEP-10: tx.source is the anchor's server account; the client account is the source of the first op.
    const account = tx.operations[0]?.source;
    if (!account) {
      throw new Error('SEP-10 challenge has no client account operation');
    }

    const tokenRes = await fetch(authBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: signedTransactionXdr }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new AnchorRequestError('SEP-10 token', tokenRes.status, err);
    }
    const token = (await tokenRes.json()) as Sep10Token;
    return { ...token, account };
  }

  async sep10Authenticate(secretKey: string): Promise<Sep10Token> {
    const kp = Keypair.fromSecret(secretKey);
    const account = kp.publicKey();
    const { transaction } = await this.sep10Challenge(account);
    const tx = TransactionBuilder.fromXDR(transaction, this.networkPassphrase);
    tx.sign(kp);
    const { token } = await this.sep10TokenFromSignedTransaction(tx.toXDR());
    return { token };
  }
}
