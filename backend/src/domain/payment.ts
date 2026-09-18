import type { DecimalString } from './money.js';

export type PaymentRouteType = 'stellar_transfer' | 'stellar_swap_transfer' | 'fiat_payout';

export type BalanceSource = 'available' | 'earn';

export type PaymentQuoteRequest = {
  fromAccount: string;
  recipient: string;
  sourceAmount: DecimalString;
  sourceAssetCode: 'USDC' | 'XLM';
  destinationCurrency: string;
  balanceSource?: BalanceSource;
};

export type PaymentRouteQuote = {
  quoteId: string;
  routeType: PaymentRouteType;
  source: { assetCode: string; amount: DecimalString };
  destination: { currency: string; amount: DecimalString };
  fee: { assetCode: string; amount: DecimalString };
  estimatedArrivalMinutes: number;
  expiresAt: string;
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
  steps: Array<{ type: string; description: string }>;
};
