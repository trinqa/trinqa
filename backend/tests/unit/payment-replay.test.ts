import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { QuoteStore } from '../../src/services/quote-store.service.js';
import { MemoryOperationStore, recordOperation } from '../../src/services/operation-store.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import { PaymentExecutionService } from '../../src/services/payment-execution.service.js';
import { YieldService } from '../../src/services/yield.service.js';
import { PolicyService } from '../../src/services/policy.service.js';

describe('Payment replay protection', () => {
  it('rejects executing the same stellar_payment step twice', async () => {
    const stellar = new StellarService(env);
    const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
    const defindex = new DefindexYieldAdapter(env);
    const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
    const quotes = new QuoteStore();
    const ops = new MemoryOperationStore();
    const sessions = new AnchorSessionStore();
    const policy = new PolicyService(env, stellar);
    const yieldSvc = new YieldService(defindex, policy, ops);
    const execution = new PaymentExecutionService(
      env,
      stellar,
      defindex,
      soroswap,
      anchor,
      sessions,
      yieldSvc,
      quotes,
      ops,
    );

    const quote = quotes.save({
      routeType: 'stellar_transfer',
      candidateCount: 1,
      source: { assetCode: 'USDC', amount: '1.0000000' },
      destination: { currency: 'USDC', amount: '1.0000000' },
      receiveAmount: '1.0000000',
      receiveCurrency: 'USDC',
      debitAmount: '1.0000000',
      debitAsset: 'USDC',
      fee: { assetCode: 'USDC', amount: '0' },
      estimatedArrivalMinutes: 2,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      providerPayload: { fromAccount: 'G'.repeat(56), recipient: 'H'.repeat(56) },
    });

    const op = await recordOperation(ops, {
      kind: 'payment',
      status: 'awaiting_signature',
      accountId: 'G'.repeat(56),
      title: 'pay',
      metadata: { quoteId: quote.quoteId, routeType: 'stellar_transfer', currentStep: 'stellar_payment' },
    });

    vi.spyOn(stellar, 'submitSignedXdr').mockResolvedValue({ successful: true, hash: 'abc' });
    await execution.executeStep(op.id, 'stellar_payment', 'signed-xdr');
    await expect(execution.executeStep(op.id, 'stellar_payment', 'signed-xdr')).rejects.toMatchObject({
      code: 'ALREADY_COMPLETED',
    });
  });
});
