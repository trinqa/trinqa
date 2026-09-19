import type { SFSymbol } from 'sf-symbols-typescript';

export interface AccountSummary {
  accountName: string;
  cardLabel: string;
  balance: string;
  displayCurrency: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  amountDirection: 'in' | 'out';
  date: string;
  symbol?: import('sf-symbols-typescript').SFSymbol;
}

export interface EarnSummary {
  totalBalance: string;
  available: string;
  earning: string;
  earningBalance: string;
  strategy: string;
  estimatedApy: string;
  risk: string;
}

export interface EarnActivityItem {
  id: string;
  title: string;
  amount: string;
  amountDirection: 'in' | 'out';
  date: string;
  time: string;
  group: 'today' | 'yesterday';
}

export interface ActivityMetric {
  id: string;
  label: string;
  value: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  displayValue?: string;
}

export type AddMoneySourceId = 'bank' | 'card' | 'wallet' | 'receive';

export interface AddMoneySourceOption {
  id: AddMoneySourceId;
  title: string;
  subtitle: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
}

export interface AddMoneyQuote {
  amount: number;
  currency: CurrencyCode;
  receivedAmount: number;
  receivedCurrency: CurrencyCode;
  exchangeRate: number;
  fee: number;
  estimatedTime: string;
}

export type AddMoneyStep = 'network' | 'amount' | 'review' | 'processing' | 'success';

export type PutToWorkRiskId = 'stable' | 'balanced' | 'growth';
export type PutToWorkHorizonId = 'anytime' | 'seven-days' | 'thirty-days' | 'date';
export type PutToWorkStep = 'strategy' | 'amount' | 'review' | 'success';
export type PutToWorkOrigin = 'add-money' | 'wallet' | 'earn';

export interface PutToWorkRiskProfile {
  id: PutToWorkRiskId;
  title: string;
  riskLabel: string;
  reviewRiskLabel: string;
  estimatedApy: number;
  accessDescription: string;
  mainRisk: string;
  recommendationReason: string;
  underlyingProvider?: string;
}

export interface PutToWorkHorizon {
  id: PutToWorkHorizonId;
  title: string;
  accessLabel: string;
  explanation: string;
}

export interface PutToWorkQuote {
  amount: number;
  estimatedYearlyReturn: number;
  availableAfter: number;
  earningAfter: number;
}

export type PaymentCurrency = CurrencyCode;
export type PaymentStep = 'recipient' | 'amount' | 'review' | 'processing' | 'success';
export type PaymentStatus = 'initiated' | 'converting' | 'sending' | 'completed' | 'failed';

export interface PaymentRecipient {
  id: string;
  name: string;
  detail: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
  country?: string;
  preferredCurrency?: PaymentCurrency;
}

export interface PaymentIntent {
  recipientId: string;
  recipient: PaymentRecipient;
  receiveAmount: number;
  receiveCurrency: PaymentCurrency;
}

export interface PaymentQuote {
  receiveAmount: number;
  receiveCurrency: PaymentCurrency;
  debitAmount: number;
  debitCurrency: CurrencyCode;
  fee: number;
  exchangeRate: number;
  estimatedArrival: string;
  routeId: string;
  hasSufficientAvailable: boolean;
  hasSufficientTotal: boolean;
  availableContribution: number;
  earnContribution: number;
  status: 'ready' | 'unavailable';
}

export interface CompletedPayment {
  id: string;
  recipient: PaymentRecipient;
  receiveAmount: number;
  receiveCurrency: PaymentCurrency;
  displayAmount: string;
  timestamp: string;
  status: Extract<PaymentStatus, 'completed'>;
}

export type WithdrawalCurrency = CurrencyCode;
export type WithdrawalStep = 'amount' | 'destination' | 'review' | 'processing' | 'success';
export type WithdrawalStatus =
  | 'initiated'
  | 'unwinding'
  | 'converting'
  | 'sending'
  | 'completed'
  | 'failed';

export interface WithdrawalDestination {
  id: string;
  name: string;
  detail: string;
  kind: 'bank' | 'wallet';
  symbol: import('sf-symbols-typescript').SFSymbol;
}

export interface WithdrawalIntent {
  amount: number;
  payoutCurrency: WithdrawalCurrency;
  destinationId: string;
}

export interface WithdrawalQuote {
  receiveAmount: number;
  receiveCurrency: WithdrawalCurrency;
  debitAmount: number;
  debitCurrency: CurrencyCode;
  fee: number;
  exchangeRate: number;
  estimatedArrival: string;
  availableAmount: number;
  availableDebitAmount: number;
  requiresEarnUnwind: boolean;
  earnUnwindAmount: number;
  routeId: string;
  hasSufficientTotal: boolean;
}

export interface CompletedWithdrawal {
  id: string;
  destination: WithdrawalDestination;
  receiveAmount: number;
  receiveCurrency: WithdrawalCurrency;
  displayAmount: string;
  debitAmount: number;
  availableDebitAmount: number;
  earnUnwindAmount: number;
  timestamp: string;
  status: Extract<WithdrawalStatus, 'completed'>;
}

export interface ActivityListItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  timestamp: string;
  category: Exclude<ActivitySegment, 'all'>;
  group: string;
  symbol?: import('sf-symbols-typescript').SFSymbol;
  iconStyle?: 'default' | 'earning' | 'amazon';
  status: TransactionStatus;
}

export type ActivitySegment = 'all' | 'payments' | 'earnings';

export type EarnSegment = 'earnings' | 'strategies';

export interface WalletTransactionItem {
  id: string;
  title: string;
  detail: string;
  amount: string;
  time: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
  iconStyle: 'neutral' | 'accent';
  group: string;
}

export interface EarnListItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  meta: string;
  footerLeadingText: string;
  footerTrailingText: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
  iconStyle: 'earning' | 'strategy';
  segment: EarnSegment;
  action?: 'manage-strategy' | 'details';
  status?: TransactionStatus;
}
export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'BRL';
export type CapabilityStatus = 'mock' | 'unavailable' | 'live' | 'unsupported';
export type MoneyOperation = 'deposit' | 'receive' | 'pay' | 'withdraw' | 'display';

export interface CurrencyCapability {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
  canDeposit: boolean;
  canReceive: boolean;
  canPay: boolean;
  canWithdraw: boolean;
  canDisplay: boolean;
  status: CapabilityStatus;
}

export interface NetworkCapability {
  id: 'stellar' | 'ethereum' | 'base';
  displayName: string;
  canDeposit: boolean;
  status: CapabilityStatus;
}

export type AccountBootstrapState = 'new' | 'creating' | 'ready' | 'error';

export interface AccountIdentity {
  id: string;
  displayName: string;
  initials: string;
  displayCurrency: CurrencyCode;
  ledgerAsset?: 'USDC' | 'TRY';
  publicReceiveIdentifier?: string;
  networkDetails?: {
    network: string;
    address: string;
    asset: string;
  };
}

export interface BalanceState {
  available: number;
  earning: number;
  baseCurrency: 'TRY' | 'USDC';
}

export type OperationState =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'pending'
  | 'success'
  | 'error';

export type TransactionType =
  | 'payment'
  | 'received'
  | 'deposit'
  | 'withdrawal'
  | 'yield-earned'
  | 'added-to-earning'
  | 'returned-to-available'
  | 'rebalance';

export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type TransactionDirection = 'in' | 'out' | 'neutral';

export interface TransactionRouteDetails {
  network?: string;
  transactionHash?: string;
  provider?: string;
  route?: string;
}

/** Backend-ready normalized transaction read model shared by every screen. */
export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  subtitle: string;
  amount: number;
  currency: CurrencyCode;
  direction: TransactionDirection;
  status: TransactionStatus;
  occurredAt: string;
  symbol?: SFSymbol;
  iconStyle?: 'default' | 'earning' | 'amazon';
  fee?: { amount: number; currency: CurrencyCode };
  recipient?: string;
  source?: string;
  arrival?: string;
  routeDetails?: TransactionRouteDetails;
}

export interface StrategyPreference {
  risk: PutToWorkRiskId;
  timeHorizon: {
    kind: PutToWorkHorizonId;
    targetDate?: string;
  };
}

export interface StrategyRecommendation {
  id: PutToWorkRiskId;
  title: string;
  riskLabel: string;
  estimatedApy: number;
  accessDescription: string;
  mainRisk: string;
  recommendationReason: string;
  underlyingProvider?: string;
  currentAllocation?: string;
}

export interface ReceiveIntent {
  amount?: string;
  currency?: CurrencyCode;
  recipientAccountId: string;
}

export interface ReceivePresentation {
  displayAmount?: string;
  displayCurrency?: CurrencyCode;
  qrPayload: string;
  shareText: string;
  receiveIdentifier: string;
  networkDetails?: AccountIdentity['networkDetails'];
}
