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
}

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

export type InstallmentSegment = 'four' | 'six';

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

export interface InstallmentItem {
  id: string;
  title: string;
  merchant: string;
  amount: string;
  dueDate: string;
  installment: string;
  symbol: import('sf-symbols-typescript').SFSymbol;
  plan: InstallmentSegment;
}
