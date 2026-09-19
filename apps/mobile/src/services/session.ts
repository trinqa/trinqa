import { getPayRecipient } from '@/config/env';
import { api } from '@/services/api';
import { BackendApiError } from '@/services/apiErrors';
import { currentSigner } from '@/services/signer';
import type { BackendCapabilities, ExecuteStepResponse } from '@/services/types';

let cachedAnchor:
  | { sessionId: string; expiresAt: number }
  | null = null;

export function stellarAmount(value: number, decimals = 7): string {
  return value.toFixed(decimals);
}

export function parseAmount(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function payRecipientOrSelf(accountId: string): string {
  return getPayRecipient() ?? accountId;
}

export async function ensureAnchorSession(): Promise<string> {
  if (cachedAnchor && Date.now() < cachedAnchor.expiresAt - 60_000) {
    return cachedAnchor.sessionId;
  }
  const session = await api.demoSep10();
  // SEP-12: register the customer with the anchor before quoting or moving money.
  await api.anchorCustomerPut(session.sessionId);
  cachedAnchor = {
    sessionId: session.sessionId,
    expiresAt: Date.parse(session.expiresAt) || Date.now() + 50 * 60 * 1000,
  };
  return session.sessionId;
}

export function clearAnchorSession() {
  cachedAnchor = null;
}

export async function signXdr(unsignedXdr: string): Promise<string> {
  return currentSigner().signXdr(unsignedXdr);
}

export async function pollTransfer(
  sessionId: string,
  transferId: string,
  operationId?: string,
  timeoutMs = 120_000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { transfer } = await api.anchorTransfer(transferId, sessionId, operationId);
    const status = transfer.transaction?.status;
    if (status === 'completed') return transfer;
    if (status === 'error' || status === 'refunded') {
      throw new BackendApiError('TRANSFER_FAILED', `Transfer ${status}`, 502);
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new BackendApiError('TRANSFER_TIMEOUT', 'Transfer timed out', 504);
}

const EXECUTION_STEPS = ['yield_withdraw', 'stellar_payment', 'soroswap_swap', 'anchor_withdraw'] as const;

function asStep(value: string | undefined): (typeof EXECUTION_STEPS)[number] | null {
  return EXECUTION_STEPS.find((step) => step === value) ?? null;
}

export async function executeBuiltPayment(built: {
  operationId: string;
  unsignedXdr?: string;
  currentStep?: string;
}): Promise<ExecuteStepResponse | { operationId: string; successful: true }> {
  let unsignedXdr = built.unsignedXdr;
  let step = asStep(built.currentStep);
  let last: ExecuteStepResponse | null = null;

  while (unsignedXdr && step) {
    const signedXdr = await signXdr(unsignedXdr);
    last = await api.paymentsExecuteStep({
      operationId: built.operationId,
      step,
      signedXdr,
    });
    if (last.successful === false) {
      throw new BackendApiError('PAYMENT_FAILED', 'Payment submission failed', 502, last);
    }
    unsignedXdr = last.unsignedXdr;
    step = asStep(last.nextStep);
  }

  return last ?? { operationId: built.operationId, successful: true };
}

export function earnUnavailable(capabilities: BackendCapabilities | null): boolean {
  if (!capabilities) return true;
  return capabilities.features.earn !== 'beta';
}

export function earnUnavailableReason(capabilities: BackendCapabilities | null): string {
  const earn = capabilities?.features.earn;
  if (earn === 'missing_vault_or_key') {
    return 'DeFindex is not configured. Yield deposits are unavailable.';
  }
  if (earn === 'degraded') {
    return 'Earn is degraded. Yield deposits are blocked until the provider recovers.';
  }
  if (!capabilities) return 'Backend capabilities are unavailable.';
  return 'Earn is not available.';
}
