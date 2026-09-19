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

export interface PaymentQuoteResponse {
  quoteId: string;
  routeType: string;
  receiveAmount: string;
  receiveCurrency: string;
  debitAmount: string;
  debitAsset: string;
  fee: { assetCode: string; amount: string };
  estimatedArrivalMinutes: number;
  funding?: {
    availableContribution: string;
    earnContribution: string;
    requiresEarnUnwind: boolean;
  };
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
