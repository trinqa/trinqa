import type { DecimalString } from './money.js';

/**
 * Anchor discovery contract (Phase 2).
 *
 * Every anchor — the TR mock anchor we execute against and the real anchors we only
 * discover or quote — is described by the same normalized snapshot, so routing never
 * branches on who the anchor is.
 */

export type RailDirection = 'deposit' | 'withdraw';

/**
 * What Trinqa can honestly do with an anchor, per the SEP surface it exposes to us:
 * - EXECUTABLE: we can move money end to end (only the TR mock anchor on testnet).
 * - QUOTE_ONLY: SEP-38 prices are readable, execution is not wired.
 * - DISCOVERY_ONLY: capabilities are readable (SEP-1/SEP-6 info), no usable quote.
 * - UNAVAILABLE: unreachable, or it lacks the SEPs our flow needs (e.g. SEP-24 only).
 */
export type AnchorStatus = 'EXECUTABLE' | 'QUOTE_ONLY' | 'DISCOVERY_ONLY' | 'UNAVAILABLE';

export type AnchorSep = 'sep1' | 'sep6' | 'sep10' | 'sep12' | 'sep24' | 'sep31' | 'sep38';

/** One asset/direction an anchor supports, as normalized from SEP-6 /info (+ SEP-38 /info for fiat). */
export interface AnchorAssetRail {
  /** Stellar asset code, e.g. "USDC". */
  assetCode: string;
  assetIssuer?: string;
  direction: RailDirection;
  enabled: boolean;
  /** ISO 4217 codes the rail settles in, e.g. ["TRY"]. Empty when the anchor does not say. */
  fiat: string[];
  /** Limits in asset units. Undefined means the anchor does not publish one. */
  min?: DecimalString;
  max?: DecimalString;
  feeFixed?: DecimalString;
  feePercent?: DecimalString;
  /** SEP-6 funding methods / types, e.g. ["bank_account"]. */
  methods: string[];
}

export interface AnchorSnapshot {
  /** Stable id, the home domain: "tr-mock-anchor.fly.dev". */
  id: string;
  domain: string;
  /** ORG_NAME from stellar.toml, falling back to the domain. */
  name: string;
  status: AnchorStatus;
  /** Why the status is not EXECUTABLE, in plain words (shown to judges and in /routes/preview). */
  statusReason?: string;
  seps: AnchorSep[];
  rails: AnchorAssetRail[];
  healthy: boolean;
  network: 'testnet' | 'mainnet';
  fetchedAt: string;
}

/** A non-binding price. Never presented as a firm quote. */
export interface IndicativePrice {
  anchorId: string;
  sellAsset: string;
  buyAsset: string;
  sellAmount: DecimalString;
  buyAmount: DecimalString;
  price: DecimalString;
  fee?: { total: DecimalString; asset: string };
  firm: false;
  source: 'sep38_price';
}

export interface IndicativePriceRequest {
  /** SEP-38 asset identifiers, e.g. "stellar:USDC:G…" and "iso4217:TRY". */
  sellAsset: string;
  buyAsset: string;
  sellAmount: DecimalString;
}

export interface AnchorAdapter {
  readonly id: string;
  readonly domain: string;
  /** Normalized capabilities; implementations cache metadata (stellar.toml, /info) for a few minutes. */
  snapshot(): Promise<AnchorSnapshot>;
  /** Unauthenticated SEP-38 GET /price when the anchor allows it; null when it cannot price. */
  indicativePrice?(req: IndicativePriceRequest): Promise<IndicativePrice | null>;
}

/** The set of anchors Trinqa knows about. Routing depends on this, not on concrete adapters. */
export interface AnchorDirectory {
  list(): Promise<AnchorSnapshot[]>;
  adapter(id: string): AnchorAdapter | undefined;
}
