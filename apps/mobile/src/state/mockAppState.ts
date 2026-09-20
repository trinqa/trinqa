import { useSyncExternalStore } from 'react';

import { isOfflineDemo } from '@/config/env';
import {
  mockAccountIdentity,
  mockInitialBalances,
  mockInitialStrategy,
  mockInitialTransactions,
} from '@/data/mocks/appFixtures';
import { convertToTry } from '@/domain/money';
import { api } from '@/services/api';
import { activityToTransaction } from '@/services/mapActivity';
import { parseAmount } from '@/services/session';
import { connectSigner, hasStoredWallet } from '@/services/signer';
import type { BackendCapabilities, BackendHealth } from '@/services/types';
import type {
  AccountBootstrapState,
  BalanceState,
  CurrencyCode,
  PaymentIntent,
  PaymentQuote,
  PutToWorkRiskId,
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
  account: import('@/types').AccountIdentity;
  balances: BalanceState;
  strategy: StrategyPreference;
  transactions: Transaction[];
  settings: MockSettings;
  health: BackendHealth | null;
  capabilities: BackendCapabilities | null;
  backendError: string | null;
}

const emptyBalances: BalanceState = { available: 0, earning: 0, baseCurrency: 'USDC' };

/** Everything healthy, so offline screens show their normal state rather than warnings. */
const offlineCapabilities: BackendCapabilities = {
  version: 'offline',
  network: 'offline',
  currencies: [],
  routes: {
    stellar_transfer: { status: 'ok' },
    stellar_swap_transfer: { status: 'ok' },
    fiat_payout: { status: 'ok' },
  },
  features: {
    pay: 'ok',
    earn: 'beta',
    demoSigner: false,
    defindex: { configured: true, ok: true },
    soroswap: { configured: true, ok: true },
    policyContract: { status: 'ok' },
  },
};

let state: MockAppState = {
  // A device that already has a wallet skips the welcome and reconnects straight away.
  accountBootstrap: hasStoredWallet() ? 'creating' : 'new',
  account: mockAccountIdentity,
  balances: emptyBalances,
  strategy: mockInitialStrategy,
  transactions: [],
  settings: { securityEnabled: true },
  health: null,
  capabilities: null,
  backendError: null,
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

function riskFromPolicy(riskProfile?: number): PutToWorkRiskId {
  if (riskProfile === 0) return 'stable';
  if (riskProfile === 2) return 'growth';
  return 'balanced';
}

export async function refreshLedger() {
  const accountId = state.account.id;
  if (!accountId.startsWith('G')) return;
  const [balancesRes, activityRes, positionsRes, policyRes] = await Promise.all([
    api.balances(accountId),
    api.activity(accountId),
    api.yieldPositions(accountId).catch(() => ({ positions: [] })),
    api.policy(accountId).catch(() => null),
  ]);
  const usdc = balancesRes.balances.find((line) => line.assetCode === 'USDC');
  const earning = positionsRes.positions.reduce(
    (sum, position) => sum + parseAmount(position.positionValue.amount),
    0,
  );
  emit({
    ...state,
    balances: {
      available: parseAmount(usdc?.amount),
      earning,
      baseCurrency: 'USDC',
    },
    transactions: activityRes.items.map(activityToTransaction),
    strategy: policyRes?.configured
      ? { ...state.strategy, risk: riskFromPolicy(policyRes.riskProfile) }
      : state.strategy,
    backendError: null,
  });
}

/**
 * Resolves the device's account, then returns its id so callers can act on it.
 *
 * Design/offline mode short-circuits the backend so screens render from fixtures.
 * Capabilities are seeded as healthy too, otherwise every screen shows a provider
 * warning that is about the missing backend rather than about the design.
 */
export async function bootstrapAccount(): Promise<string> {
  if (isOfflineDemo()) {
    // Matches what a real bootstrap produces. The flow screens present the USDC
    // ledger as USD, so an offline account on TRY would show one currency on the
    // tabs and another inside the flows — a mismatch belonging to the seed, not
    // to the design.
    const account = { ...mockAccountIdentity, displayCurrency: 'USD' as const, ledgerAsset: 'USDC' as const };
    emit({
      ...state,
      account,
      balances: mockInitialBalances,
      strategy: mockInitialStrategy,
      transactions: mockInitialTransactions,
      capabilities: offlineCapabilities,
      backendError: null,
    });
    return account.id;
  }

  const health = await api.health();
  const capabilities = await api.capabilities();
  const { accountId } = await connectSigner(capabilities);
  emit({
    ...state,
    health,
    capabilities,
    account: {
      ...state.account,
      id: accountId,
      displayCurrency: 'USD',
      ledgerAsset: 'USDC',
      publicReceiveIdentifier: accountId,
      networkDetails: {
        network: 'Stellar testnet',
        address: accountId,
        asset: 'USDC',
      },
    },
    balances: emptyBalances,
    transactions: [],
    backendError: null,
  });
  await refreshLedger();
  return accountId;
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
