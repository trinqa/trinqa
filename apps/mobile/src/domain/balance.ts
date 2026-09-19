export interface BalanceContribution {
  availableContribution: number;
  earnContribution: number;
  hasSufficientAvailable: boolean;
  hasSufficientTotal: boolean;
}

export function calculateBalanceContribution(
  requiredAmount: number,
  balances: { available: number; earning: number },
): BalanceContribution {
  const availableContribution = Math.min(requiredAmount, balances.available);
  const earnContribution = Math.max(0, requiredAmount - availableContribution);

  return {
    availableContribution,
    earnContribution,
    hasSufficientAvailable: requiredAmount <= balances.available,
    hasSufficientTotal: requiredAmount <= balances.available + balances.earning,
  };
}
