import { getApiBaseUrl, getDemoAccessToken } from '@/config/env';
import { BackendApiError } from '@/services/apiErrors';
import type {
  ActivityItem,
  AnchorQuote,
  BackendCapabilities,
  BackendHealth,
  BalanceLine,
  BuiltPaymentResponse,
  ExecuteStepResponse,
  PaymentQuoteResponse,
  PolicyView,
  YieldPosition,
  YieldStrategy,
} from '@/services/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const demoToken = path.startsWith('/api/v1/demo/') ? getDemoAccessToken() : undefined;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      // Fastify rejects an empty body declared as JSON, so only bodied requests carry it.
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(demoToken ? { 'x-demo-token': demoToken } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = { message: text };
    }
  }
  if (!res.ok) {
    throw new BackendApiError(
      String(body.error ?? 'REQUEST_FAILED'),
      String(body.message ?? res.statusText),
      res.status,
      body.details,
    );
  }
  return body as T;
}

export const api = {
  health: () => request<BackendHealth>('/api/v1/health'),
  capabilities: () => request<BackendCapabilities>('/api/v1/capabilities'),

  demoAccount: () => request<{ account: string; network: string }>('/api/v1/demo/account'),
  demoSep10: () =>
    request<{ sessionId: string; expiresAt: string }>('/api/v1/demo/sep10', { method: 'POST' }),
  demoSign: (unsignedXdr: string) =>
    request<{ signedXdr: string }>('/api/v1/demo/sign', {
      method: 'POST',
      body: JSON.stringify({ unsignedXdr }),
    }),
  demoSimulateBank: (sessionId: string, transferId: string) =>
    request<{ result: unknown }>('/api/v1/demo/anchor/simulate-bank-transfer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, transferId }),
    }),

  balances: (accountId: string) =>
    request<{ accountId: string; balances: BalanceLine[] }>(
      `/api/v1/accounts/${accountId}/balances`,
    ),
  activity: (accountId: string) =>
    request<{ accountId: string; items: ActivityItem[] }>(`/api/v1/activity/${accountId}`),
  policy: (accountId: string) => request<PolicyView>(`/api/v1/policy/${accountId}`),

  yieldStrategies: () => request<{ strategies: YieldStrategy[] }>('/api/v1/yield/strategies'),
  yieldPositions: (accountId: string) =>
    request<{ positions: YieldPosition[] }>(`/api/v1/yield/positions/${accountId}`),
  yieldDepositBuild: (body: { accountId: string; strategyId: string; amount: string }) =>
    request<{ operationId: string; unsignedXdr: string }>('/api/v1/yield/deposits/build', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  yieldExecute: (operationId: string, signedXdr: string) =>
    request<{ operationId: string; txHash?: string; successful: boolean }>('/api/v1/yield/execute', {
      method: 'POST',
      body: JSON.stringify({ operationId, signedXdr }),
    }),

  policyBuild: (body: Record<string, unknown>) =>
    request<{ unsignedXdr: string; action: string }>('/api/v1/policy/build', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  policySubmit: (signedXdr: string) =>
    request<{ hash: string; successful: boolean }>('/api/v1/policy/submit', {
      method: 'POST',
      body: JSON.stringify({ signedXdr }),
    }),

  paymentsQuote: (body: Record<string, unknown>) =>
    request<{ quote: PaymentQuoteResponse }>('/api/v1/payments/quote', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  paymentsWithdrawQuote: (body: {
    fromAccount: string;
    usdcAmount: string;
    anchorSessionId: string;
    withdrawDest: string;
    withdrawDestExtra?: string;
  }) =>
    request<{ quote: PaymentQuoteResponse }>('/api/v1/payments/withdraw/quote', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  paymentsBuild: (quoteId: string, fromAccount: string, approveEarnUnwind?: boolean) =>
    request<BuiltPaymentResponse>('/api/v1/payments/build', {
      method: 'POST',
      body: JSON.stringify({ quoteId, fromAccount, approveEarnUnwind }),
    }),
  paymentsExecuteStep: (body: {
    operationId: string;
    step: 'yield_withdraw' | 'stellar_payment' | 'soroswap_swap' | 'anchor_withdraw';
    signedXdr: string;
  }) =>
    request<ExecuteStepResponse>('/api/v1/payments/execute-step', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  anchorQuotes: (body: { sessionId: string; sellAsset: string; sellAmount: string; buyAsset?: string }) =>
    request<{ quote: AnchorQuote }>('/api/v1/anchor/quotes', { method: 'POST', body: JSON.stringify(body) }),
  anchorCustomerPut: (sessionId: string, fields: Record<string, string> = {}) =>
    request<{ result: unknown }>('/api/v1/anchor/customer', {
      method: 'PUT',
      body: JSON.stringify({ sessionId, fields }),
    }),
  anchorDeposits: (body: { sessionId: string; account: string; amount?: string; quoteId?: string }) =>
    request<{ session: { id?: string }; operationId: string }>('/api/v1/anchor/deposits', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  anchorTransfer: (id: string, sessionId: string, operationId?: string) => {
    const query = new URLSearchParams({ sessionId });
    if (operationId) query.set('operationId', operationId);
    return request<{ transfer: { transaction?: { status?: string; stellar_transaction_id?: string } } }>(
      `/api/v1/anchor/transfers/${encodeURIComponent(id)}?${query.toString()}`,
    );
  },
};
