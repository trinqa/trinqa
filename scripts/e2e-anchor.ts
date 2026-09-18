#!/usr/bin/env npx tsx
/**
 * End-to-end TR Mock Anchor smoke (testnet).
 * Run: pnpm --dir backend e2e:anchor
 */

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');

  log('config', {
    network: env.STELLAR_NETWORK,
    anchor: env.TR_ANCHOR_DOMAIN,
    usdcIssuer: env.USDC_ISSUER,
  });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);

  log('SEP-1 discover');
  console.log(await anchor.discover());

  log('anchor health');
  console.log(await anchor.health());

  log('SEP-6 info');
  console.log(await anchor.sep6Info());

  log('create test account');
  const { publicKey, secretKey } = stellar.createRandomKeypair();
  console.log({ publicKey });

  log('friendbot');
  console.log(await stellar.friendbotFund(publicKey));

  log('USDC trustline');
  const unsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
  const signed = stellar.signXdr(unsigned, secretKey);
  console.log(await stellar.submitSignedXdr(signed));

  log('SEP-10');
  const { token } = await anchor.sep10Authenticate(secretKey);
  console.log({ tokenPreview: `${token.slice(0, 20)}...` });

  log('SEP-38 quote (1000 TRY -> USDC)');
  console.log(
    await anchor.sep38Quote(token, {
      sellAsset: 'iso4217:TRY',
      buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
      sellAmount: '1000',
    }),
  );

  log('done', 'e2e-anchor OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
