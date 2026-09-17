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

export type AddMoneySourceId = 'bank' | 'card' | 'wallet';

export interface AddMoneySourceOption {
  id: AddMoneySourceId;
  title: string;
  subtitle: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
}

export interface AddMoneyQuote {
  amount: number;
  currency: 'TRY';
  receivedAmount: number;
  receivedCurrency: 'USDC';
  exchangeRate: number;
  fee: number;
  estimatedTime: string;
}

export type AddMoneyStep = 'amount' | 'review' | 'processing' | 'success';

export interface ActivityListItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  timestamp: string;
  category: Exclude<ActivitySegment, 'all'>;
  group: 'today' | 'yesterday' | 'november-18';
  symbol?: import('sf-symbols-typescript').SFSymbol;
  iconStyle?: 'default' | 'earning' | 'amazon';
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
  group: 'today' | 'yesterday';
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
}
