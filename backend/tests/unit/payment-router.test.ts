import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { CapabilityService } from '../../src/services/capability.service.js';
import { QuoteStore } from '../../src/services/quote-store.service.js';
import { MemoryOperationStore } from '../../src/services/operation-store.js';
import { PaymentRouter } from '../../src/services/payment-router.service.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { PolicyService } from '../../src/services/policy.service.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import { PaymentExecutionService } from '../../src/services/payment-execution.service.js';
import { YieldService } from '../../src/services/yield.service.js';
import { ApiError } from '../../src/domain/api-errors.js';

function makeRouter() {
  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const defindex = new DefindexYieldAdapter(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const policy = new PolicyService(env, stellar);
  const capabilities = new CapabilityService(env, anchor, defindex, soroswap, policy);
  const quotes = new QuoteStore();
  const ops = new MemoryOperationStore();
  const sessions = new AnchorSessionStore();
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
  const router = new PaymentRouter(
    env,
    stellar,
    anchor,
    soroswap,
    defindex,
    capabilities,
    quotes,
    ops,
    sessions,
    execution,
  );
  return { router, stellar, anchor, sessions, defindex };
}

describe('PaymentRouter', () => {
  it('rejects BRL payout', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '100',
      },
    ]);
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'G'.repeat(56),
        receiveAmount: '10.0000000',
        receiveCurrency: 'BRL',
      }),
    ).rejects.toMatchObject({ code: 'NO_SUPPORTED_PAYOUT_RAIL' satisfies ApiError['code'] });
  });

  it('accepts USDC source when balance sufficient', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '100.0000000',
      },
    ]);
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'G'.repeat(56),
        receiveAmount: '10.0000000',
        receiveCurrency: 'USDC',
      }),
    ).resolves.toBeDefined();
  });

  it('quotes TRY withdraw via SEP-38 when session present', async () => {
    const { router, stellar, anchor, sessions } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '100',
      },
    ]);
    vi.spyOn(anchor, 'sep38Quote').mockResolvedValue({
      id: 'q-1',
      price: '34',
      buy_amount: '340.00',
      sell_amount: '10.0000000',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const account = 'G'.repeat(56);
    const session = sessions.create('jwt-test', account);
    const withdrawDest = 'TR330006100519786457841326';
    const quote = await router.quoteWithdrawToTry(
      account,
      '10.0000000',
      session.sessionId,
      withdrawDest,
      'branch-1',
    );
    expect(quote.routeType).toBe('fiat_payout');
    // Cash-out by USDC amount must quote the sell side once, not round-trip through TRY.
    expect(anchor.sep38Quote).toHaveBeenCalledTimes(1);
    const [, sep38Request] = vi.mocked(anchor.sep38Quote).mock.calls[0]!;
    expect(Number(sep38Request.sellAmount)).toBe(10);
    expect(sep38Request.buyAmount).toBeUndefined();
    expect(Number(quote.source.amount)).toBe(10);
    expect(quote.destination.currency).toBe('TRY');
    expect(quote.providerPayload.anchorQuoteId).toBe('q-1');
    expect(quote.providerPayload.withdrawDest).toBe(withdrawDest);
    expect(quote.providerPayload.withdrawDestExtra).toBe('branch-1');
    expect(quote.destination.amount).toBe('340.00');
  });

  it('shows the anchor fee on TRY cash-out and enforces anchor withdraw limits', async () => {
    const { router, stellar, anchor, sessions } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '1000',
      },
    ]);
    vi.spyOn(anchor, 'withdrawLimits').mockResolvedValue({ min: '0.5', max: '300' });
    const sep38 = vi.spyOn(anchor, 'sep38Quote');
    const account = 'G'.repeat(56);
    const session = sessions.create('jwt-test', account);
    const request = (receiveAmount: string) =>
      router.quote({
        fromAccount: account,
        recipient: account,
        receiveAmount,
        receiveCurrency: 'TRY',
        anchorSessionId: session.sessionId,
        withdrawDest: 'TR330006100519786457841326',
      });

    sep38.mockResolvedValueOnce({
      id: 'q-ok',
      price: '0.0205',
      buy_amount: '1000.00',
      sell_amount: '20.6010768',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      fee: { total: '0.1030057', asset: `stellar:USDC:${env.USDC_ISSUER}` },
    });
    const ok = await request('1000');
    expect(ok.fee).toEqual({ assetCode: 'USDC', amount: '0.1030057' });

    sep38.mockResolvedValueOnce({
      id: 'q-big',
      price: '0.0205',
      buy_amount: '20000.00',
      sell_amount: '412.0215360',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    await expect(request('20000')).rejects.toMatchObject({
      code: 'AMOUNT_OUT_OF_RANGE',
      details: { min: '0.5', max: '300', assetCode: 'USDC' },
    });
  });

  it('honors balanceSource available without earn unwind', async () => {
    const { router, stellar, defindex } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '10.0000000',
      },
    ]);
    vi.spyOn(defindex, 'isConfigured', 'get').mockReturnValue(true);
    vi.spyOn(defindex, 'requireVault').mockReturnValue('CVAULT1234567890123456789012345678901234567890123456789012');
    vi.spyOn(defindex, 'normalizePosition').mockResolvedValue({
      strategyId: 'defindex:CVAULT',
      accountId: 'G'.repeat(56),
      positionValue: { assetCode: 'USDC', amount: '50.0000000' },
      shares: '1',
      underlyingBalances: ['50.0000000'],
    });
    const quote = await router.quote({
      fromAccount: 'G'.repeat(56),
      recipient: 'H'.repeat(56),
        receiveAmount: '7.0000000',
        receiveCurrency: 'USDC',
      balanceSource: 'available',
    });
    expect(quote.funding?.requiresEarnUnwind).toBe(false);
    expect(quote.funding?.earnContribution).toBe('0.0000000');
  });

  it('computes earn funding without throwing when unwind required', async () => {
    const { router, stellar, defindex } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '4.0000000',
      },
    ]);
    vi.spyOn(defindex, 'isConfigured', 'get').mockReturnValue(true);
    vi.spyOn(defindex, 'requireVault').mockReturnValue('CVAULT1234567890123456789012345678901234567890123456789012');
    vi.spyOn(defindex, 'normalizePosition').mockResolvedValue({
      strategyId: 'defindex:CVAULT',
      accountId: 'G'.repeat(56),
      positionValue: { assetCode: 'USDC', amount: '6.0000000' },
      shares: '1',
      underlyingBalances: ['6.0000000'],
    });
    const quote = await router.quote({
      fromAccount: 'G'.repeat(56),
      recipient: 'H'.repeat(56),
        receiveAmount: '7.0000000',
        receiveCurrency: 'USDC',
    });
    expect(quote.funding?.requiresEarnUnwind).toBe(true);
    expect(quote.funding?.earnContribution).toBe('3.0000000');
  });

  it('refuses to build a second payment from the same quote', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '100.0000000',
      },
    ]);
    vi.spyOn(stellar, 'buildPaymentXdr').mockResolvedValue('unsigned-xdr');
    vi.spyOn(stellar, 'transactionHash').mockReturnValue('tx-hash');
    const account = 'G'.repeat(56);
    const quote = await router.quote({
      fromAccount: account,
      recipient: 'H'.repeat(56),
      receiveAmount: '5.0000000',
      receiveCurrency: 'USDC',
    });
    await router.build(quote.quoteId, account);
    await expect(router.build(quote.quoteId, account)).rejects.toMatchObject({
      code: 'QUOTE_ALREADY_USED',
    });
  });

  it('reports an unreadable Horizon balance as unavailable, not as insufficient funds', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockRejectedValue(new Error('socket hang up'));
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'H'.repeat(56),
        receiveAmount: '1.0000000',
        receiveCurrency: 'USDC',
      }),
    ).rejects.toMatchObject({ code: 'ADAPTER_UNAVAILABLE', statusCode: 503 });
  });

  it('treats an unfunded (404) account as a zero balance', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockRejectedValue(
      Object.assign(new Error('Not Found'), { name: 'NotFoundError', response: { status: 404 } }),
    );
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'H'.repeat(56),
        receiveAmount: '1.0000000',
        receiveCurrency: 'USDC',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
  });

  it('returns ROUTE_UNAVAILABLE for XLM when Soroswap is not configured', async () => {
    const { router, stellar } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '10.0000000',
      },
    ]);
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'H'.repeat(56),
        receiveAmount: '1.0000000',
        receiveCurrency: 'XLM',
      }),
    ).rejects.toMatchObject({ code: 'ROUTE_UNAVAILABLE' });
  });

  it('requires approval before earn unwind build', async () => {
    const { router, stellar, defindex } = makeRouter();
    vi.spyOn(stellar, 'getBalances').mockResolvedValue([
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: env.USDC_ISSUER,
        balance: '4.0000000',
      },
    ]);
    vi.spyOn(defindex, 'isConfigured', 'get').mockReturnValue(true);
    vi.spyOn(defindex, 'requireVault').mockReturnValue('CVAULT1234567890123456789012345678901234567890123456789012');
    vi.spyOn(defindex, 'normalizePosition').mockResolvedValue({
      strategyId: 'defindex:CVAULT',
      accountId: 'G'.repeat(56),
      positionValue: { assetCode: 'USDC', amount: '6.0000000' },
      shares: '1',
      underlyingBalances: ['6.0000000'],
    });
    const account = 'G'.repeat(56);
    const quote = await router.quote({
      fromAccount: account,
      recipient: 'H'.repeat(56),
        receiveAmount: '7.0000000',
        receiveCurrency: 'USDC',
    });
    await expect(router.build(quote.quoteId, account)).rejects.toMatchObject({
      code: 'EARN_UNWIND_APPROVAL_REQUIRED',
    });
  });
});
