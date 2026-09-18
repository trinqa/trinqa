import { useSyncExternalStore } from 'react';

import {
  mockAccountIdentity,
  mockInitialBalances,
  mockInitialStrategy,
  mockInitialTransactions,
} from '@/data/mocks/appFixtures';
import { convertToTry } from '@/domain/money';
import type {
  AccountBootstrapState,
  AccountIdentity,
  BalanceState,
  CurrencyCode,
  PaymentIntent,
  PaymentQuote,
  StrategyPreference,
  Transaction,
  WithdrawalDestination,
  WithdrawalIntent,
  WithdrawalQuote,
} from '@/types';

interface MockSettings {
  securityEnabled: boolean;
}

export interface MockAppState {
  accountBootstrap: AccountBootstrapState;
  account: AccountIdentity;
  balances: BalanceState;
  strategy: StrategyPreference;
  transactions: Transaction[];
  settings: MockSettings;
}

let state: MockAppState = {
  accountBootstrap: 'new',
  account: mockAccountIdentity,
  balances: mockInitialBalances,
  strategy: mockInitialStrategy,
  transactions: mockInitialTransactions,
  settings: { securityEnabled: true },
};

const listeners = new Set<() => void>();

function emit(next: MockAppState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useMockAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setAccountBootstrap(accountBootstrap: AccountBootstrapState) {
  emit({ ...state, accountBootstrap });
}

export function setDisplayCurrency(displayCurrency: CurrencyCode) {
  emit({ ...state, account: { ...state.account, displayCurrency } });
}

export function setSecurityEnabled(securityEnabled: boolean) {
  emit({ ...state, settings: { ...state.settings, securityEnabled } });
}

function addTransaction(transaction: Transaction) {
  if (state.transactions.some((item) => item.id === transaction.id)) return false;
  state = { ...state, transactions: [transaction, ...state.transactions] };
  return true;
}

export function recordDeposit(params: {
  id: string;
  amount: number;
  creditedAmount?: number;
  currency: CurrencyCode;
  source: string;
}) {
  const amountTry = convertToTry(params.creditedAmount ?? params.amount, params.currency);
  if (!addTransaction({
    id: params.id,
    type: 'deposit',
    title: 'Deposit',
    subtitle: params.source,
    amount: params.amount,
    currency: params.currency,
    direction: 'in',
    status: 'completed',
    occurredAt: new Date().toISOString(),
    symbol: 'building.columns.fill',
    source: params.source,
  })) return;

  emit({
    ...state,
    balances: { ...state.balances, available: state.balances.available + amountTry },
  });
}

export function recordAllocation(params: {
  id: string;
  amountTry: number;
  risk: StrategyPreference['risk'];
  timeHorizon: StrategyPreference['timeHorizon'];
}) {
  if (!addTransaction({
    id: params.id,
    type: 'added-to-earning',
    title: 'Added to earning',
    subtitle: `${params.risk.charAt(0).toUpperCase()}${params.risk.slice(1)} strategy`,
    amount: params.amountTry,
    currency: 'TRY',
    direction: 'neutral',
    status: 'completed',
    occurredAt: new Date().toISOString(),
    symbol: 'arrow.triangle.2.circlepath',
    source: 'Available balance',
  })) return;

  emit({
    ...state,
    balances: {
      ...state.balances,
      available: Math.max(0, state.balances.available - params.amountTry),
      earning: state.balances.earning + params.amountTry,
    },
    strategy: { risk: params.risk, timeHorizon: params.timeHorizon },
  });
}

export function recordPayment(
  id: string,
  intent: PaymentIntent,
  quote: PaymentQuote,
) {
  if (!addTransaction({
    id,
    type: 'payment',
    title: intent.recipient.name,
    subtitle: 'Payment',
    amount: intent.receiveAmount,
    currency: intent.receiveCurrency,
    direction: 'out',
    status: 'completed',
    occurredAt: new Date().toISOString(),
    symbol: intent.recipient.symbol,
    recipient: intent.recipient.name,
    fee: { amount: quote.fee, currency: quote.debitCurrency },
    arrival: quote.estimatedArrival,
    routeDetails: {
      network: 'Mock automatic route',
      transactionHash: `mock_${id}`,
      provider: 'Trinqa mock router',
    },
  })) return;

  emit({
    ...state,
    balances: {
      ...state.balances,
      available: Math.max(0, state.balances.available - quote.availableContribution),
      earning: Math.max(0, state.balances.earning - quote.earnContribution),
    },
  });
}

export function recordWithdrawal(
  id: string,
  intent: WithdrawalIntent,
  quote: WithdrawalQuote,
  destination: WithdrawalDestination,
) {
  if (!addTransaction({
    id,
    type: 'withdrawal',
    title: 'Withdrawal',
    subtitle: destination.name,
    amount: intent.amount,
    currency: intent.payoutCurrency,
    direction: 'out',
    status: 'completed',
    occurredAt: new Date().toISOString(),
    symbol: 'arrow.down.to.line',
    recipient: destination.name,
    fee: { amount: quote.fee, currency: quote.debitCurrency },
    arrival: quote.estimatedArrival,
    routeDetails: {
      network: 'Mock automatic route',
      transactionHash: `mock_${id}`,
      provider: 'Trinqa mock router',
    },
  })) return;

  emit({
    ...state,
    balances: {
      ...state.balances,
      available: Math.max(0, state.balances.available - quote.availableDebitAmount),
      earning: Math.max(0, state.balances.earning - quote.earnUnwindAmount),
    },
  });
}

export function recordReceivedPayment(params: {
  id: string;
  amount: number;
  currency: CurrencyCode;
  source: string;
}) {
  const amountTry = convertToTry(params.amount, params.currency);
  if (!addTransaction({
    id: params.id,
    type: 'received',
    title: params.source,
    subtitle: 'Received',
    amount: params.amount,
    currency: params.currency,
    direction: 'in',
    status: 'completed',
    occurredAt: new Date().toISOString(),
    symbol: 'person.fill',
    source: params.source,
  })) return;

  emit({
    ...state,
    balances: { ...state.balances, available: state.balances.available + amountTry },
  });
}
