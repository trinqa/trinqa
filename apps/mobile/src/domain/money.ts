import { currencyCapability } from '@/data/capabilities';
import type { CurrencyCode, TransactionDirection } from '@/types';

/** Illustrative frontend-only rates expressed as TRY per currency unit. */
export const mockTryRates: Record<CurrencyCode, number> = {
  TRY: 1,
  USD: 38,
  EUR: 41,
  BRL: 7,
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertToTry(value: number, currency: CurrencyCode) {
  return roundMoney(value * mockTryRates[currency]);
}

export function convertFromTry(value: number, currency: CurrencyCode) {
  return roundMoney(value / mockTryRates[currency]);
}

export function toDisplayAmount(
  ledgerValue: number,
  account: { displayCurrency: CurrencyCode; ledgerAsset?: 'USDC' | 'TRY' },
) {
  if (account.ledgerAsset === 'USDC') {
    if (account.displayCurrency === 'USD') return roundMoney(ledgerValue);
    return convertFromTry(ledgerValue * mockTryRates.USD, account.displayCurrency);
  }
  return convertFromTry(ledgerValue, account.displayCurrency);
}

export function formatMoney(
  value: number,
  currency: CurrencyCode,
  options: { decimals?: boolean; code?: boolean } = {},
) {
  const capability = currencyCapability(currency);
  const decimals = options.decimals ?? true;
  const amount = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals ? capability.decimals : 0,
    maximumFractionDigits: decimals ? capability.decimals : 0,
  });
  return `${capability.symbol}${amount}${options.code ? ` ${currency}` : ''}`;
}

export function formatLedgerMoney(
  value: number,
  account: { displayCurrency: CurrencyCode; ledgerAsset?: 'USDC' | 'TRY' },
  options: { decimals?: boolean; code?: boolean } = {},
) {
  return formatMoney(toDisplayAmount(value, account), account.displayCurrency, options);
}

export function formatSignedMoney(
  value: number,
  currency: CurrencyCode,
  direction: TransactionDirection,
) {
  const prefix = direction === 'in' ? '+' : direction === 'out' ? '-' : '';
  return `${prefix}${formatMoney(value, currency)}`;
}
