import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAnchorRoutes } from '../../src/routes/v1/anchor.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import { MemoryOperationStore } from '../../src/services/operation-store.js';
import { AnchorRequestError, type TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';

describe('anchor routes (sessionId only)', () => {
  it('quotes reject raw jwt and accept sessionId', async () => {
    const sessions = new AnchorSessionStore();
    const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const { sessionId } = sessions.create('anchor-jwt', account);

    const anchor = {
      tomlUrl: () => 'https://example.com/.well-known/stellar.toml',
      sep38Quote: vi.fn().mockResolvedValue({ id: 'q1', buy_amount: '1' }),
    } as unknown as TrMockAnchorAdapter;

    const app = Fastify();
    registerAnchorRoutes(app, anchor, sessions, new MemoryOperationStore());

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/anchor/quotes',
      payload: { jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', sellAsset: 'iso4217:TRY', sellAmount: '100' },
    });
    expect(bad.statusCode).toBeGreaterThanOrEqual(400);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/anchor/quotes',
      payload: { sessionId, sellAsset: 'iso4217:TRY', sellAmount: '100' },
    });
    expect(ok.statusCode).toBe(200);
    expect(anchor.sep38Quote).toHaveBeenCalledWith('anchor-jwt', expect.any(Object));
    expect(JSON.stringify(ok.json())).not.toContain('anchor-jwt');

    await app.close();
  });

  it('turns an anchor 4xx rejection into a 422 with the anchor reason', async () => {
    const sessions = new AnchorSessionStore();
    const { sessionId } = sessions.create('anchor-jwt', 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    const anchor = {
      sep38Quote: vi
        .fn()
        .mockRejectedValue(new AnchorRequestError('SEP-38 quote', 400, '{"error":"Minimum off-ramp is 1.0000000 USDC"}')),
    } as unknown as TrMockAnchorAdapter;
    const app = Fastify();
    registerAnchorRoutes(app, anchor, sessions, new MemoryOperationStore());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/anchor/quotes',
      payload: { sessionId, sellAsset: 'iso4217:TRY', sellAmount: '1' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: 'ANCHOR_REJECTED', message: 'Minimum off-ramp is 1.0000000 USDC' });
    await app.close();
  });

  it('records a TRY on-ramp deposit in TRY, not as USDC', async () => {
    const sessions = new AnchorSessionStore();
    const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const { sessionId } = sessions.create('anchor-jwt', account);
    const anchor = {
      sep6Deposit: vi.fn().mockResolvedValue({ id: 'sep_1' }),
    } as unknown as TrMockAnchorAdapter;
    const operations = new MemoryOperationStore();
    const app = Fastify();
    registerAnchorRoutes(app, anchor, sessions, operations);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/anchor/deposits',
      payload: { sessionId, account, amount: '500.00', quoteId: 'qt_1' },
    });
    expect(res.statusCode).toBe(200);
    const op = await operations.get(res.json().operationId);
    expect(op?.amount).toEqual({ assetCode: 'TRY', amount: '500.00' });
    await app.close();
  });

  it('reads and submits SEP-12 customer info through the session', async () => {
    const sessions = new AnchorSessionStore();
    const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const { sessionId } = sessions.create('anchor-jwt', account);
    const anchor = {
      sep12Customer: vi.fn().mockResolvedValue({ status: 'NEEDS_INFO' }),
      sep12PutCustomer: vi.fn().mockResolvedValue({ id: 'cust-1' }),
    } as unknown as TrMockAnchorAdapter;
    const app = Fastify();
    registerAnchorRoutes(app, anchor, sessions, new MemoryOperationStore());

    const read = await app.inject({
      method: 'GET',
      url: `/api/v1/anchor/customer?sessionId=${sessionId}`,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({ status: 'NEEDS_INFO', customer: { status: 'NEEDS_INFO' } });
    expect(anchor.sep12Customer).toHaveBeenCalledWith('anchor-jwt', account);

    const put = await app.inject({
      method: 'PUT',
      url: '/api/v1/anchor/customer',
      payload: { sessionId, fields: { first_name: 'Ada' } },
    });
    expect(put.statusCode).toBe(200);
    expect(anchor.sep12PutCustomer).toHaveBeenCalledWith('anchor-jwt', account, { first_name: 'Ada' });
    expect(JSON.stringify(put.json())).not.toContain('anchor-jwt');

    await app.close();
  });
});
