import type { SFSymbol } from 'sf-symbols-typescript';

import { putToWorkHorizons, putToWorkRiskProfiles } from '@/data/mocks/putToWork';
import { allocationShare } from '@/domain/balance';
import type {
  BalanceState,
  PutToWorkHorizon,
  PutToWorkRiskProfile,
  StrategyPreference,
  Transaction,
} from '@/types';

export interface PortfolioPillar {
  id: 'plan' | 'risk' | 'when' | 'reach';
  /** The technical name, kept small. Nobody navigates by it. */
  label: string;
  /** What the user actually reads. Always a plain-language value that already exists. */
  value: string;
  symbol: SFSymbol;
}

export interface PortfolioNote {
  id: string;
  title: string;
  body: string;
  symbol: SFSymbol;
  tone: 'neutral' | 'positive';
}

export interface PortfolioSplit {
  total: number;
  readyToUse: number;
  growing: number;
  growingShare: number;
  readyShare: number;
}

export function resolveRiskProfile(strategy: StrategyPreference): PutToWorkRiskProfile {
  return (
    putToWorkRiskProfiles.find((profile) => profile.id === strategy.risk) ??
    putToWorkRiskProfiles[1]
  );
}

export function resolveHorizon(strategy: StrategyPreference): PutToWorkHorizon {
  return (
    putToWorkHorizons.find((horizon) => horizon.id === strategy.timeHorizon.kind) ??
    putToWorkHorizons[0]
  );
}

export function getPortfolioSplit(balances: BalanceState): PortfolioSplit {
  const total = balances.available + balances.earning;
  return {
    total,
    readyToUse: balances.available,
    growing: balances.earning,
    growingShare: allocationShare(balances.earning, total),
    readyShare: allocationShare(balances.available, total),
  };
}

/**
 * Strategy / Risk / Time horizon / Liquidity, but never in those words. Each value
 * is a sentence fragment the product already writes elsewhere, so the four pillars
 * read as answers rather than as a form someone has to fill in.
 */
export function getPortfolioPillars(strategy: StrategyPreference): PortfolioPillar[] {
  const profile = resolveRiskProfile(strategy);
  const horizon = resolveHorizon(strategy);

  return [
    { id: 'plan', label: 'Your plan', value: profile.title, symbol: 'target' },
    { id: 'risk', label: 'How risky', value: profile.riskLabel, symbol: 'shield' },
    { id: 'when', label: 'When you need it', value: horizon.accessLabel, symbol: 'clock' },
    {
      id: 'reach',
      label: 'Getting it back',
      value: horizon.id === 'anytime' ? 'Anytime' : 'Takes a moment',
      symbol: 'arrow.uturn.backward',
    },
  ];
}

const portfolioChangeTypes = new Set<Transaction['type']>([
  'added-to-earning',
  'returned-to-available',
  'rebalance',
]);

/** Only the movements that changed how the portfolio is arranged, newest first. */
export function portfolioChanges(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => portfolioChangeTypes.has(transaction.type)).slice(0, 4);
}

/**
 * When this portfolio started doing anything. Earnings mean little without the
 * stretch of time they were earned over, so the summary is dated rather than
 * floating free above the history.
 */
export function portfolioSince(transactions: Transaction[]): string | null {
  const earliest = transactions.reduce<string | null>((oldest, transaction) => {
    if (!oldest) return transaction.occurredAt;
    return transaction.occurredAt < oldest ? transaction.occurredAt : oldest;
  }, null);
  if (!earliest) return null;
  return new Date(earliest).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export type PortfolioPeriod = '7D' | '1M' | '6M' | '1Y';

/** Days each range covers, and how the range reads in a sentence. */
export const portfolioPeriods: {
  value: PortfolioPeriod;
  label: string;
  days: number;
  caption: string;
}[] = [
  { value: '7D', label: '7D', days: 7, caption: 'Past 7 days' },
  { value: '1M', label: '1M', days: 30, caption: 'Past month' },
  { value: '6M', label: '6M', days: 182, caption: 'Past 6 months' },
  { value: '1Y', label: '1Y', days: 365, caption: 'Past year' },
];

export function resolvePeriod(period: PortfolioPeriod) {
  return portfolioPeriods.find((entry) => entry.value === period) ?? portfolioPeriods[0];
}

/** Payouts inside the chosen window. The headline figure follows the picker. */
export function earnedWithin(
  transactions: Transaction[],
  period: PortfolioPeriod,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - resolvePeriod(period).days * 24 * 60 * 60 * 1000;
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 'yield-earned' &&
        new Date(transaction.occurredAt).getTime() >= cutoff,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

/** The most recent payout, for the summary that sits above the history. */
export function lastEarnedAt(transactions: Transaction[]): string | null {
  const latest = transactions
    .filter((transaction) => transaction.type === 'yield-earned')
    .reduce<string | null>((newest, transaction) => {
      if (!newest) return transaction.occurredAt;
      return transaction.occurredAt > newest ? transaction.occurredAt : newest;
    }, null);
  if (!latest) return null;
  return new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function totalEarned(transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.type === 'yield-earned')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

/**
 * One observation, and at most one thing to consider. A list of five
 * recommendations is a list nobody reads, so the strongest signal wins.
 */
export function getPortfolioNotes(
  split: PortfolioSplit,
  strategy: StrategyPreference,
): PortfolioNote[] {
  const profile = resolveRiskProfile(strategy);
  const horizon = resolveHorizon(strategy);
  const notes: PortfolioNote[] = [];

  if (split.total <= 0) {
    return [
      {
        id: 'empty',
        title: 'Nothing to arrange yet',
        body: 'Once you add money, this is where you will see how it is looking after itself.',
        symbol: 'tray',
        tone: 'neutral',
      },
    ];
  }

  if (split.readyShare > 0.4) {
    notes.push({
      id: 'idle',
      title: 'A lot is sitting still',
      body: `Most of your money is ready to use and is not growing. ${profile.recommendationReason}`,
      symbol: 'lightbulb',
      tone: 'neutral',
    });
  } else if (split.readyShare < 0.05) {
    notes.push({
      id: 'thin',
      title: 'Almost nothing is spare',
      body: 'Nearly all of your money is growing. Keeping a little ready makes day-to-day spending easier.',
      symbol: 'exclamationmark.circle',
      tone: 'neutral',
    });
  } else {
    notes.push({
      id: 'balanced',
      title: 'This looks sensible',
      body: 'Some money is ready for today and the rest is growing. That is a reasonable place to be.',
      symbol: 'checkmark.seal',
      tone: 'positive',
    });
  }

  notes.push({
    id: 'plan',
    title: `${profile.title} plan`,
    body: `${profile.accessDescription} ${horizon.explanation}`,
    symbol: 'target',
    tone: 'neutral',
  });

  return notes;
}
