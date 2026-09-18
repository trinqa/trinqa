import type {
  PutToWorkHorizon,
  PutToWorkQuote,
  PutToWorkRiskProfile,
} from '@/types';

export const availableToAllocate = 4220.14;
export const currentEarningBalance = 8260.18;

export const putToWorkRiskProfiles: PutToWorkRiskProfile[] = [
  {
    id: 'stable',
    title: 'Stable',
    riskLabel: 'Low risk',
    reviewRiskLabel: 'Low',
    estimatedApy: 4.2,
  },
  {
    id: 'balanced',
    title: 'Balanced',
    riskLabel: 'Medium risk',
    reviewRiskLabel: 'Medium',
    estimatedApy: 6.2,
  },
  {
    id: 'growth',
    title: 'Growth',
    riskLabel: 'Higher risk',
    reviewRiskLabel: 'Higher',
    estimatedApy: 8.1,
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
    id: 'three-months',
    title: '3 months',
    accessLabel: '3 months',
    explanation: 'A longer horizon helps Trinqa keep more of this balance earning.',
  },
  {
    id: 'one-year',
    title: '1 year',
    accessLabel: '1 year',
    explanation: 'A one-year horizon supports a longer-term earning strategy.',
  },
];

export const quickPutToWorkAmounts = [500, 1000, 2500] as const;

export function createPutToWorkQuote(
  amount: number,
  profile: PutToWorkRiskProfile,
): PutToWorkQuote {
  return {
    amount,
    estimatedYearlyReturn: amount * (profile.estimatedApy / 100),
    availableAfter: Math.max(0, availableToAllocate - amount),
    earningAfter: currentEarningBalance + amount,
  };
}
