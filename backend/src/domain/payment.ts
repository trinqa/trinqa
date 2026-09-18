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
  /** Amount the recipient should receive (7dp Stellar assets, 2dp TRY). */
  receiveAmount: DecimalString;
  receiveCurrency: string;
  balanceSource?: BalanceSource;
  anchorSessionId?: string;
  /** SEP-6 withdraw bank destination (required for TRY / fiat_payout). */
  withdrawDest?: string;
  withdrawDestExtra?: string;
};

export type PaymentRouteQuote = {
  quoteId: string;
  routeType: PaymentRouteType;
  candidateCount: number;
  routeScore?: number;
  /** USDC debited from payer (includes swap input for XLM routes). */
  source: { assetCode: 'USDC'; amount: DecimalString };
  /** What the recipient receives. */
  destination: { currency: string; amount: DecimalString };
  receiveAmount: DecimalString;
  receiveCurrency: string;
  debitAmount: DecimalString;
  debitAsset: 'USDC';
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
