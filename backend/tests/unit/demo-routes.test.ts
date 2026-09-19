import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerDemoRoutes } from '../../src/routes/v1/demo.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import { env } from '../../src/config/env.js';
import type { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';

function stellarSecretPattern() {
  return /S[A-Z0-9]{55}/;
}

describe('demo routes', () => {
  it('account/sign/simulate-bank never leak a secret and stay gated', async () => {
    const app = Fastify();
    const stellar = new StellarService(env);
    const sessions = new AnchorSessionStore();
    const anchor = {
      sep6SimulateBankTransfer: vi.fn(),
      sep10Challenge: vi.fn(),
      sep10TokenFromSignedTransaction: vi.fn(),
    } as unknown as TrMockAnchorAdapter;
    registerDemoRoutes(app, stellar, anchor, sessions);

    const account = await app.inject({ method: 'GET', url: '/api/v1/demo/account' });
    const sign = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/sign',
      payload: { unsignedXdr: 'AAAA' },
    });
    const simulate = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/anchor/simulate-bank-transfer',
      payload: { sessionId: '00000000-0000-4000-8000-000000000000', transferId: 'tx-1' },
    });

    for (const res of [account, sign, simulate]) {
      const raw = JSON.stringify(res.json());
      expect(raw).not.toMatch(stellarSecretPattern());
      if (!env.DEMO_SIGNER_ENABLED) {
        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({ error: 'demo_signer_disabled' });
      }
    }

    if (env.DEMO_SIGNER_ENABLED) {
      expect(account.statusCode).toBe(200);
      expect(account.json().account).toMatch(/^G[A-Z0-9]{55}$/);
    }

    await app.close();
  });
});
