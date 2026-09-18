import { useSyncExternalStore } from 'react';

import { initialWithdrawalBalances } from '@/data/mocks/withdraw';
import type {
  CompletedWithdrawal,
  WithdrawalDestination,
  WithdrawalIntent,
  WithdrawalQuote,
} from '@/types';

interface WithdrawalState {
  available: number;
  earning: number;
  withdrawals: CompletedWithdrawal[];
}

let withdrawalState: WithdrawalState = {
  available: initialWithdrawalBalances.available,
  earning: initialWithdrawalBalances.earning,
  withdrawals: [],
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return withdrawalState;
}

export function useWithdrawalState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function recordCompletedWithdrawal(
  id: string,
  intent: WithdrawalIntent,
  quote: WithdrawalQuote,
  destination: WithdrawalDestination,
  displayAmount: string,
) {
  const existing = withdrawalState.withdrawals.find((item) => item.id === id);
  if (existing) return;

  const withdrawal: CompletedWithdrawal = {
    id,
    destination,
    receiveAmount: intent.amount,
    receiveCurrency: intent.payoutCurrency,
    displayAmount,
    debitAmount: quote.debitAmount,
    availableDebitAmount: quote.availableDebitAmount,
    earnUnwindAmount: quote.earnUnwindAmount,
    timestamp: 'Today, 4:52 PM',
    status: 'completed',
  };

  withdrawalState = {
    available: Math.max(0, withdrawalState.available - quote.availableDebitAmount),
    earning: Math.max(0, withdrawalState.earning - quote.earnUnwindAmount),
    withdrawals: [withdrawal, ...withdrawalState.withdrawals],
  };
  listeners.forEach((listener) => listener());
}
