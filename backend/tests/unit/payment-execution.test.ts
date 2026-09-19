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

function makeExecution() {
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
  return { execution, stellar, anchor, defindex, quotes, ops, sessions };
}

describe('PaymentExecutionService', () => {
  it('passes quote withdrawDest into sep6Withdraw after earn unwind', async () => {
    const { execution, anchor, defindex, quotes, ops, sessions, stellar } = makeExecution();
    const account = 'G'.repeat(56);
    const userDest = 'TR330006100519786457841326';
    const session = sessions.create('jwt-withdraw', account);

    const quote = quotes.save({
      routeType: 'fiat_payout',
      candidateCount: 1,
      source: { assetCode: 'USDC', amount: '5.0000000' },
      destination: { currency: 'TRY', amount: '170.00' },
      fee: { assetCode: 'USDC', amount: '0' },
      estimatedArrivalMinutes: 30,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      providerPayload: {
        fromAccount: account,
        recipient: account,
        anchorSessionId: session.sessionId,
        anchorQuoteId: 'sep38-q',
        withdrawDest: userDest,
        withdrawDestExtra: 'branch-1',
      },
    });

    const op = await recordOperation(ops, {
      kind: 'payment',
      status: 'awaiting_signature',
      accountId: account,
      title: 'Pay',
      metadata: {
        quoteId: quote.quoteId,
        routeType: 'fiat_payout',
        currentStep: 'yield_withdraw',
        anchorSessionId: session.sessionId,
        withdrawDest: userDest,
        withdrawDestExtra: 'branch-1',
      },
    });

    vi.spyOn(defindex, 'isConfigured', 'get').mockReturnValue(true);
    vi.spyOn(defindex, 'sendSignedXdr').mockResolvedValue({ success: true, hash: 'withdraw-hash' });
    const treasury = 'GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6';
    const sep6 = vi.spyOn(anchor, 'sep6Withdraw').mockResolvedValue({
      id: 'transfer-1',
      account_id: treasury,
      memo: '12345',
      memo_type: 'id',
    } as never);
    const funding = vi
      .spyOn(stellar, 'buildUsdcPaymentWithMemoIdXdr')
      .mockResolvedValue('funding-xdr');
    vi.spyOn(stellar, 'transactionHash').mockReturnValue('funding-hash');
    vi.spyOn(stellar, 'networkPassphrase', 'get').mockReturnValue('Test SDF Network ; September 2015');

    const result = await execution.executeStep(op.id, 'yield_withdraw', 'signed-xdr');

    expect(sep6).toHaveBeenCalledWith(
      'jwt-withdraw',
      expect.objectContaining({
        dest: userDest,
        dest_extra: 'branch-1',
        quote_id: 'sep38-q',
      }),
    );
    expect(result.nextStep).toBe('anchor_withdraw');
    expect((result as { anchorSession?: { dest?: string } }).anchorSession?.dest).toBe(userDest);
    // After the earn unwind the client still needs the USDC funding payment to the anchor treasury.
    expect(funding).toHaveBeenCalledWith(account, treasury, '5.0000000', '12345');
    expect((result as { unsignedXdr?: string }).unsignedXdr).toBe('funding-xdr');
    const updated = await ops.get(op.id);
    expect(updated?.status).toBe('awaiting_signature');
    expect(updated?.metadata).toMatchObject({ currentStep: 'anchor_withdraw', expectedTxHash: 'funding-hash' });
  });
});
