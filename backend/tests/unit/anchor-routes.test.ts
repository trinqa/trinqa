import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAnchorRoutes } from '../../src/routes/v1/anchor.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import type { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';

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
    registerAnchorRoutes(app, anchor, sessions);

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
});
