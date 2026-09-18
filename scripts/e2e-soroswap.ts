#!/usr/bin/env npx tsx
/**
 * Soroswap testnet quote → build → sign → send (USDC-funded account, recipient routing).
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');
  const { SoroswapAdapter } = await import('../backend/src/adapters/soroswap.adapter.js');
  const { SoroswapAssetRegistry } = await import('../backend/src/services/soroswap-asset-registry.js');
  const { toAtomic } = await import('../backend/src/domain/money.js');
  const { fundTestnetUsdcAccount } = await import('./lib/testnet-usdc-fixture.ts');

  if (!env.SOROSWAP_API_KEY) {
    console.error('BLOCKED: SOROSWAP_API_KEY');
    process.exit(2);
  }

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const registry = new SoroswapAssetRegistry(soroswap);

  const usdc = await registry.resolveClassicAsset('USDC', env.USDC_ISSUER);
  const xlm = await registry.resolveClassicAsset('XLM');
  if (!usdc || !xlm) {
    console.error('FAIL: could not resolve testnet asset contracts via Soroswap token list');
    process.exit(1);
  }

  const payer = stellar.createRandomKeypair();
  const recipient = stellar.createRandomKeypair();
  await fundTestnetUsdcAccount({ stellar, anchor, env, keypair: payer });
  await stellar.friendbotFund(recipient.publicKey);
  log('accounts', { payer: payer.publicKey, recipient: recipient.publicKey });

  const balancesBefore = await stellar.getBalances(recipient.publicKey);
  log('recipient balances before', balancesBefore);

  const amountIn = toAtomic('0.5000000', 7);
  const quote = await soroswap.quoteExactIn({ assetIn: usdc, assetOut: xlm, amountIn });
  log('quote', quote);

  const built = await soroswap.buildFromQuote(quote, payer.publicKey, recipient.publicKey);
  const xdr = built.xdr;
  if (!xdr) {
    console.error('FAIL: build returned no XDR');
    process.exit(1);
  }
  const sent = await soroswap.sendSignedXdr(stellar.signXdr(xdr, payer.secretKey));
  log('send', sent);

  const balancesAfter = await stellar.getBalances(recipient.publicKey);
  log('recipient balances after', balancesAfter);

  const xlmAfter = Number(balancesAfter.find((b) => b.assetCode === 'XLM')?.balance ?? '0');
  const xlmBefore = Number(balancesBefore.find((b) => b.assetCode === 'XLM')?.balance ?? '0');
  if (xlmAfter <= xlmBefore) {
    console.error('FAIL: recipient XLM did not increase');
    process.exit(1);
  }

  console.log('\nPASS Soroswap swap', {
    pair: 'USDC→XLM',
    txHash: (sent as { txHash?: string }).txHash,
    recipient: recipient.publicKey,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
