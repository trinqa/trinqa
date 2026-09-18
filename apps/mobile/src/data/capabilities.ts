import type {
  CurrencyCapability,
  CurrencyCode,
  MoneyOperation,
  NetworkCapability,
} from '@/types';

/** UI-only capabilities. A backend capability response replaces this array later. */
export const mockCurrencyCapabilities: readonly CurrencyCapability[] = [
  {
    code: 'TRY',
    symbol: '₺',
    name: 'Turkish lira',
    locale: 'tr-TR',
    decimals: 2,
    canDeposit: true,
    canReceive: true,
    canPay: true,
    canWithdraw: true,
    canDisplay: true,
    status: 'mock',
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US dollar',
    locale: 'en-US',
    decimals: 2,
    canDeposit: true,
    canReceive: true,
    canPay: true,
    canWithdraw: true,
    canDisplay: true,
    status: 'mock',
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-IE',
    decimals: 2,
    canDeposit: true,
    canReceive: true,
    canPay: true,
    canWithdraw: true,
    canDisplay: true,
    status: 'mock',
  },
  {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian real',
    locale: 'pt-BR',
    decimals: 2,
    canDeposit: false,
    canReceive: true,
    canPay: true,
    canWithdraw: true,
    canDisplay: true,
    status: 'mock',
  },
] as const;

export const mockNetworkCapabilities: readonly NetworkCapability[] = [
  { id: 'stellar', displayName: 'Stellar', canDeposit: true, status: 'mock' },
  { id: 'ethereum', displayName: 'Ethereum', canDeposit: true, status: 'mock' },
  { id: 'base', displayName: 'Base', canDeposit: true, status: 'mock' },
] as const;

const operationKey: Record<MoneyOperation, keyof CurrencyCapability> = {
  deposit: 'canDeposit',
  receive: 'canReceive',
  pay: 'canPay',
  withdraw: 'canWithdraw',
  display: 'canDisplay',
};

export function currenciesFor(operation: MoneyOperation): CurrencyCode[] {
  const key = operationKey[operation];
  return mockCurrencyCapabilities
    .filter((currency) => currency[key] === true && currency.status === 'mock')
    .map((currency) => currency.code);
}

export function currencyCapability(code: CurrencyCode): CurrencyCapability {
  return (
    mockCurrencyCapabilities.find((currency) => currency.code === code) ??
    mockCurrencyCapabilities[0]
  );
}

export function depositNetworks(): NetworkCapability[] {
  return mockNetworkCapabilities.filter(
    (network) => network.canDeposit && network.status === 'mock',
  );
}
