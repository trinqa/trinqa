import type { Operation } from '../domain/operation.js';
import type { PushNotification } from './push-sender.service.js';

/** The only deep links the app accepts; anything else lands on the home screen. */
export const NOTIFICATION_ROUTES = [
  '/',
  '/activity',
  '/earn',
  '/pay',
  '/account-details',
  '/settings',
] as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[number];

/** " 12.5 USDC" or "" — an amount is only ever named when the operation carries one. */
function amountPhrase(amount: Operation['amount']): string {
  if (!amount?.amount || !amount.assetCode) return '';
  return ` ${amount.amount} ${amount.assetCode}`;
}

/** An incoming USDC payment seen on the ledger. */
export function moneyArrived(amount: string | undefined, txHash: string | undefined): PushNotification {
  return {
    title: 'Money arrived',
    body: amount
      ? `${amount} USDC is now in your Trinqa account.`
      : 'Money is now in your Trinqa account.',
    data: { route: '/activity' satisfies NotificationRoute, ...(txHash ? { txHash } : {}) },
  };
}

export function anchorDepositCompleted(op: Operation): PushNotification {
  return {
    title: 'Money added',
    body: `Your${amountPhrase(op.amount)} deposit is done. The money is in your Trinqa account.`,
    data: { route: '/activity' satisfies NotificationRoute, operationId: op.id },
  };
}

export function anchorWithdrawCompleted(op: Operation): PushNotification {
  return {
    title: 'Money sent',
    body: `Your${amountPhrase(op.amount)} withdrawal has been paid out.`,
    data: { route: '/activity' satisfies NotificationRoute, operationId: op.id },
  };
}

/**
 * A failed anchor transfer. We know the transfer stopped, not where the money is, so the
 * copy sends the user to the activity screen instead of guessing.
 */
export function anchorTransferFailed(op: Operation): PushNotification {
  const title =
    op.kind === 'anchor_deposit'
      ? 'Deposit didn’t go through'
      : op.kind === 'anchor_withdraw'
        ? 'Withdrawal didn’t go through'
        : 'Transfer didn’t go through';
  return {
    title,
    body: 'We couldn’t finish it. Open Trinqa to see what happened.',
    data: { route: '/activity' satisfies NotificationRoute, operationId: op.id },
  };
}

export function yieldDepositCompleted(op: Operation): PushNotification {
  const phrase = amountPhrase(op.amount);
  return {
    title: 'Your money started earning',
    body: phrase ? `${phrase.trim()} is now set aside to grow.` : 'Your money is now set aside to grow.',
    data: { route: '/earn' satisfies NotificationRoute, operationId: op.id },
  };
}

export function paymentCompleted(op: Operation): PushNotification {
  return {
    title: 'Payment sent',
    body: `Your${amountPhrase(op.amount)} payment went through.`,
    data: { route: '/activity' satisfies NotificationRoute, operationId: op.id },
  };
}
