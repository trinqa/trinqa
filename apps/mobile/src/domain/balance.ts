export interface BalanceContribution {
  availableContribution: number;
  earnContribution: number;
  hasSufficientAvailable: boolean;
  hasSufficientTotal: boolean;
}

export interface PortfolioTotals {
  total: number;
  readyToUse: number;
  growing: number;
}

export function getPortfolioTotals(balances: {
  available: number;
  earning: number;
}): PortfolioTotals {
  return {
    total: balances.available + balances.earning,
    readyToUse: balances.available,
    growing: balances.earning,
  };
}

/** Deterministic 0–1 share. Zero total yields 0, never NaN/Infinity. */
export function allocationShare(part: number, total: number): number {
  if (total <= 0) return 0;
  const share = part / total;
  if (!Number.isFinite(share) || share < 0) return 0;
  return Math.min(share, 1);
}

export function formatSharePercent(share: number): string {
  return `${(share * 100).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
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
