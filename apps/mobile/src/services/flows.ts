import { TRY_WITHDRAW_DEST } from '@/config/env';
import { api } from '@/services/api';
import { BackendApiError } from '@/services/apiErrors';
import {
  earnUnavailable,
  earnUnavailableReason,
  ensureAnchorSession,
  executeBuiltPayment,
  payRecipientOrSelf,
  pollTransfer,
  signXdr,
  stellarAmount,
} from '@/services/session';
import type { BackendCapabilities } from '@/services/types';
import { refreshLedger } from '@/state/mockAppState';
import type { PutToWorkHorizonId, PutToWorkRiskId } from '@/types';

export async function executeAddMoney(params: {
  accountId: string;
  amount: number;
  currency: string;
  sourceId: string;
}) {
  if (params.sourceId === 'card') {
    throw new BackendApiError('ROUTE_UNAVAILABLE', 'Card deposits are not available.', 422);
  }
  if (params.sourceId === 'wallet') {
    throw new BackendApiError(
      'ROUTE_UNAVAILABLE',
      'Only Stellar / TRY bank deposits are available.',
      422,
    );
  }
  if (params.currency !== 'TRY') {
    throw new BackendApiError(
      'ROUTE_UNAVAILABLE',
      `${params.currency} deposits are not available. TRY on-ramp is the supported rail.`,
      422,
    );
  }
  const sessionId = await ensureAnchorSession();
  const sellAmount = String(params.amount);
  const { quote } = await api.anchorQuotes({
    sessionId,
    sellAsset: 'iso4217:TRY',
    sellAmount,
  });
  const deposit = await api.anchorDeposits({
    sessionId,
    account: params.accountId,
    amount: sellAmount,
    quoteId: quote.id,
  });
  const transferId = deposit.session.id;
  if (!transferId) {
    throw new BackendApiError('ADAPTER_UNAVAILABLE', 'Deposit did not return a transfer id', 502);
  }
  await api.demoSimulateBank(sessionId, transferId);
  await pollTransfer(sessionId, transferId, deposit.operationId);
  await refreshLedger();
}

export async function executePay(params: {
  accountId: string;
  amount: number;
  currency: string;
  approveEarnUnwind: boolean;
}) {
  if (params.currency === 'BRL') {
    throw new BackendApiError(
      'NO_SUPPORTED_PAYOUT_RAIL',
      'BRL payouts are not supported.',
      422,
    );
  }
  if (params.currency === 'EUR' || params.currency === 'TRY') {
    throw new BackendApiError(
      'ROUTE_UNAVAILABLE',
      `${params.currency} pay is not a direct Stellar rail. Use USD/USDC or Withdraw TRY.`,
      422,
    );
  }
  const receiveCurrency = params.currency === 'USD' ? 'USDC' : params.currency;
  const { quote } = await api.paymentsQuote({
    fromAccount: params.accountId,
    recipient: payRecipientOrSelf(params.accountId),
    receiveAmount: stellarAmount(params.amount),
    receiveCurrency,
    balanceSource: 'available',
  });
  const built = await api.paymentsBuild(quote.quoteId, params.accountId, params.approveEarnUnwind);
  const result = await executeBuiltPayment(built);
  if ('successful' in result && result.successful === false) {
    throw new BackendApiError('PAYMENT_FAILED', 'Payment submission failed', 502);
  }
  await refreshLedger();
}

export async function executeWithdrawTry(params: {
  accountId: string;
  usdcAmount: number;
  currency: string;
  dest?: string;
  approveEarnUnwind: boolean;
}) {
  if (params.currency !== 'TRY') {
    throw new BackendApiError(
      params.currency === 'BRL' ? 'NO_SUPPORTED_PAYOUT_RAIL' : 'ROUTE_UNAVAILABLE',
      `${params.currency} withdrawals are not supported. TRY is the only payout rail.`,
      422,
    );
  }
  const sessionId = await ensureAnchorSession();
  const { quote } = await api.paymentsWithdrawQuote({
    fromAccount: params.accountId,
    usdcAmount: stellarAmount(params.usdcAmount),
    anchorSessionId: sessionId,
    withdrawDest: params.dest ?? TRY_WITHDRAW_DEST,
  });
  const built = await api.paymentsBuild(quote.quoteId, params.accountId, params.approveEarnUnwind);
  await executeBuiltPayment(built);
  const transferId = built.anchorSession?.transferId;
  if (transferId) {
    await pollTransfer(sessionId, transferId, built.operationId);
  }
  await refreshLedger();
}

function riskProfile(id: PutToWorkRiskId) {
  if (id === 'stable') return 0;
  if (id === 'growth') return 2;
  return 1;
}

function targetTimestamp(horizon: PutToWorkHorizonId, date: Date) {
  const now = Math.floor(Date.now() / 1000);
  if (horizon === 'seven-days') return now + 7 * 24 * 3600;
  if (horizon === 'thirty-days') return now + 30 * 24 * 3600;
  if (horizon === 'date') return Math.floor(date.getTime() / 1000);
  return now + 365 * 24 * 3600;
}

export async function executePutToWork(params: {
  accountId: string;
  amount: number;
  risk: PutToWorkRiskId;
  horizon: PutToWorkHorizonId;
  targetDate: Date;
  capabilities: BackendCapabilities | null;
}): Promise<{ deposited: boolean }> {
  const builtPolicy = await api.policyBuild({
    action: 'set_policy',
    accountId: params.accountId,
    policy: {
      riskProfile: riskProfile(params.risk),
      targetTimestamp: targetTimestamp(params.horizon, params.targetDate),
      liquidityTargetBps: params.risk === 'stable' ? 1000 : params.risk === 'growth' ? 5000 : 3000,
      automationPaused: false,
      allowedStrategies: [],
    },
  });
  const signedPolicy = await signXdr(builtPolicy.unsignedXdr);
  const submitted = await api.policySubmit(signedPolicy);
  if (!submitted.successful) {
    throw new BackendApiError('POLICY_FAILED', 'Policy submit failed', 502);
  }

  if (earnUnavailable(params.capabilities)) {
    await refreshLedger();
    return { deposited: false };
  }

  const { strategies } = await api.yieldStrategies();
  const strategy = strategies[0];
  if (!strategy) {
    throw new BackendApiError(
      'ADAPTER_UNAVAILABLE',
      earnUnavailableReason(params.capabilities),
      503,
    );
  }
  const builtDeposit = await api.yieldDepositBuild({
    accountId: params.accountId,
    strategyId: strategy.id,
    amount: stellarAmount(params.amount),
  });
  const signedDeposit = await signXdr(builtDeposit.unsignedXdr);
  const executed = await api.yieldExecute(builtDeposit.operationId, signedDeposit);
  if (!executed.successful) {
    throw new BackendApiError('ADAPTER_UNAVAILABLE', 'Yield deposit failed', 502);
  }
  await refreshLedger();
  return { deposited: true };
}
