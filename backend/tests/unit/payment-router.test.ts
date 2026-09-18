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
import { ApiError } from '../../src/domain/api-errors.js';

describe('PaymentRouter', () => {
  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const defindex = new DefindexYieldAdapter(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const policy = new PolicyService(env, stellar);
  const capabilities = new CapabilityService(env, anchor, defindex, soroswap, policy);
  const quotes = new QuoteStore();
  const ops = new MemoryOperationStore();

  const router = new PaymentRouter(env, stellar, anchor, soroswap, capabilities, quotes, ops);

  it('rejects BRL payout', async () => {
    await expect(
      router.quote({
        fromAccount: 'G'.repeat(56),
        recipient: 'G'.repeat(56),
        sourceAmount: '10',
        sourceAssetCode: 'USDC',
        destinationCurrency: 'BRL',
      }),
    ).rejects.toMatchObject({ code: 'NO_SUPPORTED_PAYOUT_RAIL' satisfies ApiError['code'] });
  });

  it('requires explicit earn unwind', async () => {
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
        sourceAmount: '10',
        sourceAssetCode: 'USDC',
        destinationCurrency: 'USDC',
        balanceSource: 'earn',
      }),
    ).rejects.toMatchObject({ code: 'EARN_UNWIND_REQUIRED' });
  });
});
