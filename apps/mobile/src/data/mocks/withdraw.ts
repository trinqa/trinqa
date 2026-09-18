import type {
  WithdrawalCurrency,
  WithdrawalDestination,
  WithdrawalIntent,
  WithdrawalQuote,
} from '@/types';

export const initialWithdrawalBalances = {
  available: 4220.14,
  earning: 8260.18,
} as const;

export const withdrawalCurrencies: WithdrawalCurrency[] = ['TRY', 'EUR', 'USD'];
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
  { exchangeRate: number; fee: number; routeId: string }
> = {
  TRY: { exchangeRate: 0.027, fee: 1.2, routeId: 'mock-exit-try' },
  EUR: { exchangeRate: 1.0832, fee: 1.2, routeId: 'mock-exit-eur' },
  USD: { exchangeRate: 1, fee: 1.2, routeId: 'mock-exit-usd' },
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function createWithdrawalQuote(
  intent: WithdrawalIntent,
  balances: { available: number; earning: number },
): WithdrawalQuote {
  const configuration = currencyConfiguration[intent.payoutCurrency];
  const debitAmount = roundCurrency(
    intent.amount * configuration.exchangeRate + configuration.fee,
  );
  const availableDebitAmount = Math.min(debitAmount, balances.available);
  const earnUnwindAmount = roundCurrency(
    Math.max(0, debitAmount - availableDebitAmount),
  );

  return {
    receiveAmount: intent.amount,
    receiveCurrency: intent.payoutCurrency,
    debitAmount,
    debitCurrency: 'USD',
    fee: configuration.fee,
    exchangeRate: configuration.exchangeRate,
    estimatedArrival: '~1–2 min',
    availableAmount: balances.available,
    availableDebitAmount,
    requiresEarnUnwind: earnUnwindAmount > 0,
    earnUnwindAmount,
    routeId: configuration.routeId,
    hasSufficientTotal: debitAmount <= balances.available + balances.earning,
  };
}

export function maximumWithdrawalAmount(
  currency: WithdrawalCurrency,
  totalBalance: number,
) {
  const configuration = currencyConfiguration[currency];
  return Math.floor(
    Math.max(0, totalBalance - configuration.fee) / configuration.exchangeRate,
  );
}
