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
    accessDescription: 'Easier to take out. Smaller ups and downs.',
    mainRisk: 'The return can change, and this money can go down.',
    recommendationReason: 'Stable is for money you may need sooner.',
    underlyingProvider: 'Mock earning provider',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    riskLabel: 'Medium risk',
    reviewRiskLabel: 'Medium',
    estimatedApy: 6.2,
    accessDescription: 'A middle path: some growth, still usable.',
    mainRisk: 'This money can go down if markets move.',
    recommendationReason: 'Balanced is a middle path between safety and growth.',
    underlyingProvider: 'Mock earning provider',
  },
  {
    id: 'growth',
    title: 'Growth',
    riskLabel: 'Higher risk',
    reviewRiskLabel: 'Higher',
    estimatedApy: 8.1,
    accessDescription: 'Best for money you can leave alone longer.',
    mainRisk: 'This money can go down more than the other plans.',
    recommendationReason: 'Growth aims for more return and takes more risk.',
    underlyingProvider: 'Mock earning provider',
  },
];

export const putToWorkHorizons: PutToWorkHorizon[] = [
  {
    id: 'anytime',
    title: 'Anytime',
    accessLabel: 'Anytime',
    explanation: 'You can move this money back whenever you want.',
  },
  {
    id: 'seven-days',
    title: '7+ days',
    accessLabel: '7+ days',
    explanation: 'Leave it at least a week if you can.',
  },
  {
    id: 'thirty-days',
    title: '30+ days',
    accessLabel: '30+ days',
    explanation: 'Leave it at least a month if you can.',
  },
  {
    id: 'date',
    title: 'Pick a date',
    accessLabel: 'Target date',
    explanation: 'Pick the day you think you will need it.',
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
