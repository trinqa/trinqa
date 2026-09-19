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
import type { AnchorQuote, BackendCapabilities, PaymentQuoteResponse } from '@/services/types';
import { refreshLedger } from '@/state/mockAppState';
import type { PutToWorkHorizonId, PutToWorkRiskId } from '@/types';

/** Live SEP-38 TRY→USDC quote for the Add Money review; `executeAddMoney` deposits against it. */
export interface AddMoneyLiveQuote {
  sessionId: string;
  quote: AnchorQuote;
}

function assertTryBankDeposit(sourceId: string, currency: string) {
  if (sourceId === 'card') {
    throw new BackendApiError('ROUTE_UNAVAILABLE', 'Card deposits are not available.', 422);
  }
  if (sourceId === 'wallet') {
    throw new BackendApiError(
      'ROUTE_UNAVAILABLE',
      'Only Stellar / TRY bank deposits are available.',
      422,
    );
  }
  if (currency !== 'TRY') {
    throw new BackendApiError(
      'ROUTE_UNAVAILABLE',
      `${currency} deposits are not available. TRY on-ramp is the supported rail.`,
      422,
    );
  }
}

export async function quoteAddMoney(params: {
  amount: number;
  currency: string;
  sourceId: string;
}): Promise<AddMoneyLiveQuote> {
  assertTryBankDeposit(params.sourceId, params.currency);
  const sessionId = await ensureAnchorSession();
  const { quote } = await api.anchorQuotes({
    sessionId,
    sellAsset: 'iso4217:TRY',
    sellAmount: String(params.amount),
  });
  return { sessionId, quote };
}

function isExpiring(expiresAt: string | undefined, marginMs = 30_000) {
  const t = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(t) && Date.now() > t - marginMs;
}

export async function executeAddMoney(params: {
  accountId: string;
  live: AddMoneyLiveQuote;
  amount: number;
  currency: string;
  sourceId: string;
}) {
  // The anchor rejects expired quotes; refresh rather than failing the deposit.
  const live = isExpiring(params.live.quote.expires_at)
    ? await quoteAddMoney({ amount: params.amount, currency: params.currency, sourceId: params.sourceId })
    : params.live;
  const deposit = await api.anchorDeposits({
    sessionId: live.sessionId,
    account: params.accountId,
    amount: live.quote.sell_amount,
    quoteId: live.quote.id,
  });
  const transferId = deposit.session.id;
  if (!transferId) {
    throw new BackendApiError('ADAPTER_UNAVAILABLE', 'Deposit did not return a transfer id', 502);
  }
  await api.demoSimulateBank(live.sessionId, transferId);
  await pollTransfer(live.sessionId, transferId, deposit.operationId);
  await refreshLedger();
}

/** Live USDC payment quote for the Pay review; `executePay` builds against the same quote. */
export interface PayLiveQuote {
  quote: PaymentQuoteResponse;
}

export async function quotePay(params: {
  accountId: string;
  amount: number;
  currency: string;
}): Promise<PayLiveQuote> {
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
  return { quote };
}

export async function executePay(params: {
  accountId: string;
  live: PayLiveQuote;
  amount: number;
  currency: string;
  approveEarnUnwind: boolean;
}) {
  const live = isExpiring(params.live.quote.expiresAt)
    ? await quotePay({ accountId: params.accountId, amount: params.amount, currency: params.currency })
    : params.live;
  const built = await api.paymentsBuild(live.quote.quoteId, params.accountId, params.approveEarnUnwind);
  const result = await executeBuiltPayment(built);
  if ('successful' in result && result.successful === false) {
    throw new BackendApiError('PAYMENT_FAILED', 'Payment submission failed', 502);
  }
  await refreshLedger();
}

/** Live TRY cash-out quote: `tryAmount` is what lands in the bank; the BFF prices the USDC debit and fee. */
export interface WithdrawLiveQuote {
  sessionId: string;
  quote: PaymentQuoteResponse;
}

export async function quoteWithdrawTry(params: {
  accountId: string;
  tryAmount: number;
  currency: string;
  dest?: string;
}): Promise<WithdrawLiveQuote> {
  if (params.currency !== 'TRY') {
    throw new BackendApiError(
      params.currency === 'BRL' ? 'NO_SUPPORTED_PAYOUT_RAIL' : 'ROUTE_UNAVAILABLE',
      `${params.currency} withdrawals are not supported. TRY is the only payout rail.`,
      422,
    );
  }
  const sessionId = await ensureAnchorSession();
  const { quote } = await api.paymentsQuote({
    fromAccount: params.accountId,
    recipient: params.accountId,
    receiveAmount: params.tryAmount.toFixed(2),
    receiveCurrency: 'TRY',
    anchorSessionId: sessionId,
    withdrawDest: params.dest ?? TRY_WITHDRAW_DEST,
  });
  return { sessionId, quote };
}

export async function executeWithdrawTry(params: {
  accountId: string;
  live: WithdrawLiveQuote;
  tryAmount: number;
  currency: string;
  dest?: string;
  approveEarnUnwind: boolean;
}) {
  // Quotes are single-use and expire after a few minutes; refresh a stale one instead of failing.
  const live = isExpiring(params.live.quote.expiresAt)
    ? await quoteWithdrawTry({
        accountId: params.accountId,
        tryAmount: params.tryAmount,
        currency: params.currency,
        dest: params.dest,
      })
    : params.live;
  const built = await api.paymentsBuild(live.quote.quoteId, params.accountId, params.approveEarnUnwind);
  await executeBuiltPayment(built);
  const transferId = built.anchorSession?.transferId;
  if (transferId) {
    await pollTransfer(live.sessionId, transferId, built.operationId);
  }
  await refreshLedger();
}

/**
 * Plain wording for the allocation policy contract's refusal reasons, keyed by the `reason`
 * the backend puts in `details`. Reasons that are not listed keep the backend's own message:
 * we only restate what we can describe accurately.
 */
const POLICY_DENIED_COPY: Record<string, string> = {
  AutomationPaused: 'Growing money is paused on your account, so this money was not moved.',
  StrategyNotAllowed:
    'Your saved plan does not allow this way of growing money, so this money was not moved.',
};

function rethrowPolicyDenied(err: unknown): never {
  if (err instanceof BackendApiError && err.code === 'POLICY_DENIED') {
    const reason = (err.details as { reason?: string } | undefined)?.reason;
    const copy = reason ? POLICY_DENIED_COPY[reason] : undefined;
    if (copy) throw new BackendApiError(err.code, copy, err.status, err.details);
  }
  throw err;
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
  // The build simulates the policy contract, so the user's own policy can refuse it here.
  const builtDeposit = await api
    .yieldDepositBuild({
      accountId: params.accountId,
      strategyId: strategy.id,
      amount: stellarAmount(params.amount),
    })
    .catch(rethrowPolicyDenied);
  const signedDeposit = await signXdr(builtDeposit.unsignedXdr);
  const executed = await api.yieldExecute(builtDeposit.operationId, signedDeposit);
  if (!executed.successful) {
    throw new BackendApiError('ADAPTER_UNAVAILABLE', 'Yield deposit failed', 502);
  }
  await refreshLedger();
  return { deposited: true };
}
