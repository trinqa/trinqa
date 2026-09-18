import TOML from 'toml';
import {
  Keypair,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { AppConfig } from '../config/env.js';

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
};

export type Sep10Token = {
  token: string;
};

export type Sep38QuoteRequest = {
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
};

export type Sep38Quote = {
  id: string;
  price: string;
  buy_amount: string;
  sell_amount: string;
  expires_at: string;
  [key: string]: unknown;
};

export class TrMockAnchorAdapter {
  constructor(
    private readonly config: AppConfig,
    private readonly networkPassphrase: string,
  ) {}

  get domain(): string {
    return this.config.TR_ANCHOR_DOMAIN;
  }

  tomlUrl(): string {
    return `https://${this.domain}/.well-known/stellar.toml`;
  }

  async discover(): Promise<AnchorToml> {
    const res = await fetch(this.tomlUrl());
    if (!res.ok) {
      throw new Error(`SEP-1 TOML fetch failed: ${res.status}`);
    }
    const raw = await res.text();
    const parsed = TOML.parse(raw) as Record<string, unknown>;
    const currencies = parsed.CURRENCIES as Array<{ code?: string; issuer?: string }> | undefined;
    const usdc = currencies?.find((c) => c.code === 'USDC');

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
    };
  }

  async health(): Promise<{ ok: boolean; body: unknown }> {
    const res = await fetch(`https://${this.domain}/health`);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  }

  async sep6Info(): Promise<unknown> {
    const toml = await this.discover();
    const base = toml.transferServer ?? `https://${this.domain}/sep6`;
    const res = await fetch(`${base}/info`);
    if (!res.ok) {
      throw new Error(`SEP-6 info failed: ${res.status}`);
    }
    return res.json();
  }

  async sep12Customer(token: string, account: string): Promise<unknown> {
    const toml = await this.discover();
    const base = toml.kycServer ?? `https://${this.domain}/sep12`;
    const res = await fetch(`${base}/customer?account=${encodeURIComponent(account)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SEP-12 customer failed (${res.status}): ${err.slice(0, 200)}`);
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
        sell_amount: req.sellAmount,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SEP-38 quote failed (${res.status}): ${err.slice(0, 300)}`);
    }
    return res.json() as Promise<Sep38Quote>;
  }

  private async transferServerBase(): Promise<string> {
    const toml = await this.discover();
    return toml.transferServer ?? `https://${this.domain}/sep6`;
  }

  async sep6DepositInteractive(
    token: string,
    body: { asset_code: string; account: string; amount?: string },
  ): Promise<unknown> {
    const base = await this.transferServerBase();
    const res = await fetch(`${base}/transactions/deposit/interactive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SEP-6 deposit failed (${res.status}): ${err.slice(0, 300)}`);
    }
    return res.json();
  }

  async sep6WithdrawInteractive(
    token: string,
    body: { asset_code: string; account: string; amount: string; dest: string; dest_extra?: string },
  ): Promise<unknown> {
    const base = await this.transferServerBase();
    const res = await fetch(`${base}/transactions/withdraw/interactive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SEP-6 withdraw failed (${res.status}): ${err.slice(0, 300)}`);
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
      throw new Error(`SEP-6 transaction failed (${res.status}): ${err.slice(0, 300)}`);
    }
    return res.json();
  }

  async sep10Authenticate(secretKey: string): Promise<Sep10Token> {
    const kp = Keypair.fromSecret(secretKey);
    const account = kp.publicKey();
    const toml = await this.discover();
    const authBase = toml.webAuthEndpoint ?? `https://${this.domain}/auth`;

    const challengeRes = await fetch(`${authBase}?account=${encodeURIComponent(account)}`);
    if (!challengeRes.ok) {
      throw new Error(`SEP-10 challenge failed: ${challengeRes.status}`);
    }
    const { transaction } = (await challengeRes.json()) as { transaction: string };
    const tx = TransactionBuilder.fromXDR(transaction, this.networkPassphrase);
    tx.sign(kp);

    const tokenRes = await fetch(authBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: tx.toXDR() }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`SEP-10 token failed (${tokenRes.status}): ${err.slice(0, 200)}`);
    }
    return tokenRes.json() as Promise<Sep10Token>;
  }
}
