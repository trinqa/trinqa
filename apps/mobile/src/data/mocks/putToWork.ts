import type {
  PutToWorkHorizon,
  PutToWorkQuote,
  PutToWorkRiskProfile,
} from '@/types';

export const putToWorkRiskProfiles: PutToWorkRiskProfile[] = [
  {
    id: 'stable',
    title: 'Stable',
    riskLabel: 'Low risk',
    reviewRiskLabel: 'Low',
    estimatedApy: 4.2,
    accessDescription: 'Designed for flexible access and lower volatility.',
    mainRisk: 'Rates can change and the underlying strategy can lose value.',
    recommendationReason: 'Stable prioritizes access and lower expected volatility.',
    underlyingProvider: 'Mock earning provider',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    riskLabel: 'Medium risk',
    reviewRiskLabel: 'Medium',
    estimatedApy: 6.2,
    accessDescription: 'Flexible access with a balanced liquidity target.',
    mainRisk: 'Market, provider and smart contract risk can affect returns.',
    recommendationReason: 'Balanced matches moderate risk with flexible access.',
    underlyingProvider: 'Mock earning provider',
  },
  {
    id: 'growth',
    title: 'Growth',
    riskLabel: 'Higher risk',
    reviewRiskLabel: 'Higher',
    estimatedApy: 8.1,
    accessDescription: 'Best suited to money that can remain allocated longer.',
    mainRisk: 'Higher market and strategy risk can reduce principal value.',
    recommendationReason: 'Growth targets higher expected return with higher risk.',
    underlyingProvider: 'Mock earning provider',
  },
];

export const putToWorkHorizons: PutToWorkHorizon[] = [
  {
    id: 'anytime',
    title: 'Anytime',
    accessLabel: 'Anytime',
    explanation: 'Funds stay flexible. You can move money back to available at any time.',
  },
  {
    id: 'seven-days',
    title: '7+ days',
    accessLabel: '7+ days',
    explanation: 'A short horizon keeps liquidity in focus while money earns.',
  },
  {
    id: 'thirty-days',
    title: '30+ days',
    accessLabel: '30+ days',
    explanation: 'A longer horizon supports a broader earning strategy.',
  },
  {
    id: 'date',
    title: 'Pick a date',
    accessLabel: 'Target date',
    explanation: 'Trinqa can plan liquidity around the date you choose.',
  },
];

export const quickPutToWorkAmounts = [500, 1000, 2500] as const;

export function createPutToWorkQuote(
  amount: number,
  profile: PutToWorkRiskProfile,
  balances: { available: number; earning: number },
): PutToWorkQuote {
  return {
    amount,
    estimatedYearlyReturn: amount * (profile.estimatedApy / 100),
    availableAfter: Math.max(0, balances.available - amount),
    earningAfter: balances.earning + amount,
  };
}
