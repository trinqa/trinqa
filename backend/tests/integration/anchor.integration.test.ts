import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';

describe('TR Mock Anchor integration (live testnet)', () => {
  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);

  it('SEP-6 info and SEP-38 info', async () => {
    const [sep6, sep38] = await Promise.all([anchor.sep6Info(), anchor.sep38Info()]);
    expect(sep6).toMatchObject({
      deposit: expect.objectContaining({ USDC: expect.any(Object) }),
    });
    expect(sep38).toMatchObject({ assets: expect.any(Array) });
  });

  it('SEP-10 + SEP-38 quote on ephemeral funded account', async () => {
    const { publicKey, secretKey } = stellar.createRandomKeypair();
    await stellar.friendbotFund(publicKey);
    expect(await stellar.accountExists(publicKey)).toBe(true);

    const unsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
    const signed = stellar.signXdr(unsigned, secretKey);
    await stellar.submitSignedXdr(signed);

    const balances = await stellar.getBalances(publicKey);
    expect(stellar.hasUsdcTrustline(balances)).toBe(true);

    const { token } = await anchor.sep10Authenticate(secretKey);
    expect(token.split('.').length).toBe(3);

    const quote = await anchor.sep38Quote(token, {
      sellAsset: 'iso4217:TRY',
      buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
      sellAmount: '1000',
    });
    expect(Number(quote.buy_amount)).toBeGreaterThan(0);
    expect(quote.id).toBeTruthy();
  });
});
