import type { DecimalString } from './money.js';

export type PaymentRouteType = 'stellar_transfer' | 'stellar_swap_transfer' | 'fiat_payout';

export type BalanceSource = 'available' | 'earn';

export type PaymentFundingBreakdown = {
  availableBalance: DecimalString;
  earningBalance: DecimalString;
  totalBalance: DecimalString;
  availableContribution: DecimalString;
  earnContribution: DecimalString;
  requiresEarnUnwind: boolean;
};

export type PaymentQuoteRequest = {
  fromAccount: string;
  recipient: string;
  sourceAmount: DecimalString;
  sourceAssetCode: 'USDC';
  destinationCurrency: string;
  balanceSource?: BalanceSource;
  anchorSessionId?: string;
};

export type PaymentRouteQuote = {
  quoteId: string;
  routeType: PaymentRouteType;
  candidateCount: number;
  routeScore?: number;
  source: { assetCode: string; amount: DecimalString };
  destination: { currency: string; amount: DecimalString };
  fee: { assetCode: string; amount: DecimalString };
  estimatedArrivalMinutes: number;
  expiresAt: string;
  funding?: PaymentFundingBreakdown;
  requiresPolicyAuthorization?: {
    action: 'authorize_allocation' | 'yield_withdraw';
    strategyId?: string;
    message: string;
  };
  providerPayload: Record<string, unknown>;
};

export type BuiltPayment = {
  operationId: string;
  unsignedXdr?: string;
  networkPassphrase: string;
  anchorSession?: Record<string, unknown>;
  currentStep?: string;
  steps: Array<{ type: string; description: string }>;
};

export type PaymentExecutionStep =
  | 'yield_withdraw'
  | 'stellar_payment'
  | 'soroswap_swap'
  | 'anchor_withdraw';
