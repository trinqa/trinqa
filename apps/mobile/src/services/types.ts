export type ProviderHealthState = 'healthy' | 'unconfigured' | 'blocked' | 'fragmented';

export type EarnFeatureState = 'beta' | 'degraded' | 'missing_vault_or_key';

export interface BackendHealth {
  status: 'ok' | 'degraded';
  network: string;
  horizon: boolean;
  demoSigner: boolean;
  defindex: { configured?: boolean; ok?: boolean; state?: ProviderHealthState; error?: string };
  soroswap: { configured?: boolean; ok?: boolean; state?: ProviderHealthState };
  policy: { contractId?: string; wasmHash?: string };
  anchor: { domain?: string; healthy?: boolean };
}

export interface BackendCurrencyCapability {
  code: string;
  symbol: string;
  decimals: number;
  canDeposit: boolean;
  canWithdraw: boolean;
  payoutRail: string | null;
  status: string;
  reason?: string;
}

export interface BackendCapabilities {
  version: string;
  network: string;
  currencies: BackendCurrencyCapability[];
  routes: {
    stellar_transfer: { status: string };
    stellar_swap_transfer: { status: string };
    fiat_payout: { status: string; supported?: string[]; unsupported?: string[] };
  };
  features: {
    pay: string;
    earn: EarnFeatureState | string;
    demoSigner: boolean;
    defindex: { configured?: boolean; ok?: boolean; error?: string };
    soroswap: { configured?: boolean; ok?: boolean };
    policyContract: { status: string; contractId?: string };
  };
}

/** A seeded demo contact resolved to its own funded testnet account. */
export interface DemoContact {
  id: string;
  account: string;
  created: boolean;
  trustlineAdded: boolean;
}

export interface BalanceLine {
  assetType: string;
  assetCode: string;
  assetIssuer: string | null;
  amount: string;
}

export interface ActivityItem {
  id: string;
  kind: string;
  status: string;
  title: string;
  subtitle: string | null;
  occurredAt: string;
  amount: { assetCode: string; amount: string } | null;
  txHash: string | null;
}

/** SEP-38 firm quote as relayed by the BFF. */
export interface AnchorQuote {
  id: string;
  price: string;
  sell_asset: string;
  sell_amount: string;
  buy_asset: string;
  buy_amount: string;
  expires_at: string;
  fee?: { total: string; asset: string };
}

export interface PaymentQuoteResponse {
  quoteId: string;
  routeType: string;
  receiveAmount: string;
  receiveCurrency: string;
  debitAmount: string;
  debitAsset: string;
  fee: { assetCode: string; amount: string };
  estimatedArrivalMinutes: number;
  expiresAt: string;
  funding?: {
    availableContribution: string;
    earnContribution: string;
    requiresEarnUnwind: boolean;
  };
  /** Free-form provider data; TRY payouts carry the route decision under `routeDecision`. */
  providerPayload?: Record<string, unknown>;
}

export interface BuiltPaymentResponse {
  operationId: string;
  unsignedXdr?: string;
  currentStep?: string;
  networkPassphrase: string;
  steps: Array<{ type: string; description: string }>;
  anchorSession?: { transferId?: string };
}

export interface ExecuteStepResponse {
  operationId: string;
  stepCompleted?: string;
  nextStep?: string;
  unsignedXdr?: string;
  txHash?: string;
  successful?: boolean;
}

export interface YieldStrategy {
  id: string;
  name: string;
  risk: string;
  estimatedApy: number;
  vaultAddress: string;
}

export interface YieldPosition {
  strategyId: string;
  accountId: string;
  positionValue: { assetCode: string; amount: string };
}

export interface PolicyView {
  accountId: string;
  configured: boolean;
  riskProfile?: number;
}

// --- Phase 2 routing -------------------------------------------------------

export type AnchorStatus = 'EXECUTABLE' | 'QUOTE_ONLY' | 'DISCOVERY_ONLY' | 'UNAVAILABLE';

export type RouteFactorKey =
  | 'netCost'
  | 'speed'
  | 'reliability'
  | 'liquidity'
  | 'horizonFit'
  | 'riskFit'
  | 'yieldImpact';

export type RouteRejectReason =
  | 'CURRENCY_UNSUPPORTED'
  | 'DIRECTION_UNSUPPORTED'
  | 'BELOW_MIN'
  | 'ABOVE_MAX'
  | 'SEP_MISSING'
  | 'UNAVAILABLE'
  | 'KYC_REQUIRED'
  | 'NOT_EXECUTABLE';

export interface ScoredRoute {
  routeId: string;
  anchorId: string;
  anchorName: string;
  status: AnchorStatus;
  score: number;
  /** 0-100 per factor; pair with factorSources to tell computed values from advised ones. */
  factors: Record<RouteFactorKey, number>;
  factorSources: Record<RouteFactorKey, 'deterministic' | 'advisor'>;
  advisorRationale?: string;
}

export interface RejectedRoute {
  anchorId: string;
  anchorDomain: string;
  anchorName: string;
  status: AnchorStatus;
  reasons: RouteRejectReason[];
  detail?: string;
}

export interface RouteAdvisorInfo {
  name: 'jev' | 'none';
  used: boolean;
  minConfidence: number;
  fallbackReason?: 'disabled' | 'timeout' | 'error' | 'low_confidence' | 'invalid_output' | 'no_routes';
}

export interface RouteDecision {
  request: {
    direction: 'withdraw' | 'deposit';
    fiatCurrency: string;
    assetCode: string;
    amount: string;
    requireExecutable?: boolean;
    user?: { riskProfile: 0 | 1 | 2; daysToTarget: number };
  };
  eligible: ScoredRoute[];
  rejected: RejectedRoute[];
  chosen: ScoredRoute | null;
  executable: boolean;
  advisor: RouteAdvisorInfo;
  decidedAt: string;
}

/** The compact decision a payment quote carries (TRY payouts only today). */
export interface QuoteRouteDecision {
  chosenRouteId: string | null;
  chosenAnchor: string | null;
  executable: boolean;
  /** Execution always runs through the configured anchor, whatever scored best. */
  executedVia: string;
  advisor: RouteAdvisorInfo;
  eligible: Array<{ routeId: string; score: number }>;
  rejected: Array<{ anchorId: string; reasons: RouteRejectReason[] }>;
}

export interface AnchorAssetRail {
  assetCode: string;
  assetIssuer?: string;
  direction: 'deposit' | 'withdraw';
  enabled: boolean;
  fiat: string[];
  min?: string;
  max?: string;
  feeFixed?: string;
  feePercent?: string;
  methods: string[];
}

export interface AnchorSnapshot {
  id: string;
  domain: string;
  name: string;
  status: AnchorStatus;
  statusReason?: string;
  seps: string[];
  rails: AnchorAssetRail[];
  healthy: boolean;
  network: 'testnet' | 'mainnet';
  fetchedAt: string;
}
