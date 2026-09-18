import { useSyncExternalStore } from 'react';

import type { CompletedPayment, PaymentIntent } from '@/types';

let completedPayments: CompletedPayment[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return completedPayments;
}

export function useCompletedPayments() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function recordCompletedPayment(
  id: string,
  intent: PaymentIntent,
  displayAmount: string,
) {
  const payment: CompletedPayment = {
    id,
    recipient: intent.recipient,
    receiveAmount: intent.receiveAmount,
    receiveCurrency: intent.receiveCurrency,
    displayAmount,
    timestamp: 'Today, 12:18 PM',
    status: 'completed',
  };

  completedPayments = [
    payment,
    ...completedPayments.filter((item) => item.id !== payment.id),
  ];
  listeners.forEach((listener) => listener());
}
