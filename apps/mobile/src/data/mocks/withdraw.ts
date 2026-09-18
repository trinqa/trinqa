import type {
  WithdrawalCurrency,
  WithdrawalDestination,
  WithdrawalIntent,
  WithdrawalQuote,
} from '@/types';
import { currenciesFor } from '@/data/capabilities';
import { calculateBalanceContribution } from '@/domain/balance';
import { mockTryRates, roundMoney } from '@/domain/money';

export const withdrawalCurrencies = currenciesFor('withdraw') as WithdrawalCurrency[];
export const quickWithdrawalAmounts = [250, 500, 1000] as const;

export const withdrawalDestinations: WithdrawalDestination[] = [
  {
    id: 'garanti-4281',
    name: 'Garanti BBVA',
    detail: '•••• 4281',
    kind: 'bank',
    symbol: 'building.columns.fill',
  },
  {
    id: 'crypto-wallet',
    name: 'Crypto wallet',
    detail: 'Saved wallet address',
    kind: 'wallet',
    symbol: 'wallet.bifold',
  },
];

const currencyConfiguration: Record<
  WithdrawalCurrency,
  { fee: number; routeId: string }
> = {
  TRY: { fee: 15, routeId: 'mock-exit-try' },
  EUR: { fee: 35, routeId: 'mock-exit-eur' },
  USD: { fee: 35, routeId: 'mock-exit-usd' },
  BRL: { fee: 25, routeId: 'mock-exit-brl' },
};

export function createWithdrawalQuote(
  intent: WithdrawalIntent,
  balances: { available: number; earning: number },
): WithdrawalQuote {
  const configuration = currencyConfiguration[intent.payoutCurrency];
  const exchangeRate = mockTryRates[intent.payoutCurrency];
  const debitAmount = roundMoney(
    intent.amount * exchangeRate + configuration.fee,
  );
  const contribution = calculateBalanceContribution(debitAmount, balances);

  return {
    receiveAmount: intent.amount,
    receiveCurrency: intent.payoutCurrency,
    debitAmount,
    debitCurrency: 'TRY',
    fee: configuration.fee,
    exchangeRate,
    estimatedArrival: '~1–2 min',
    availableAmount: balances.available,
    availableDebitAmount: contribution.availableContribution,
    requiresEarnUnwind: contribution.earnContribution > 0,
    earnUnwindAmount: contribution.earnContribution,
    routeId: configuration.routeId,
    hasSufficientTotal: contribution.hasSufficientTotal,
  };
}

export function maximumWithdrawalAmount(
  currency: WithdrawalCurrency,
  totalBalance: number,
) {
  const configuration = currencyConfiguration[currency];
  return Math.floor(
    Math.max(0, totalBalance - configuration.fee) / mockTryRates[currency],
  );
}
