#!/usr/bin/env npx tsx
/**
 * Soroswap testnet quote → build → sign → send.
 */

import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { SoroswapAdapter } = await import('../backend/src/adapters/soroswap.adapter.js');
  const { SoroswapAssetRegistry } = await import('../backend/src/services/soroswap-asset-registry.js');
  const { toAtomic } = await import('../backend/src/domain/money.js');

  if (!env.SOROSWAP_API_KEY) {
    console.error('BLOCKED: SOROSWAP_API_KEY');
    process.exit(2);
  }

  const stellar = new StellarService(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const registry = new SoroswapAssetRegistry(soroswap);

  const usdc = await registry.resolveClassicAsset('USDC', env.USDC_ISSUER);
  const xlm = await registry.resolveClassicAsset('XLM');
  if (!usdc || !xlm) {
    console.error('FAIL: could not resolve testnet asset contracts');
    process.exit(1);
  }

  const kp = Keypair.random();
  const account = kp.publicKey();
  await stellar.friendbotFund(account);
  const trust = await stellar.buildUsdcTrustlineXdr(account);
  await stellar.submitSignedXdr(stellar.signXdr(trust, kp.secret()));

  const balancesBefore = await stellar.getBalances(account);
  log('balances before', balancesBefore);

  const amountIn = toAtomic('0.5000000', 7);
  const quote = await soroswap.quoteExactIn({ assetIn: usdc, assetOut: xlm, amountIn });
  log('quote', quote);

  const built = await soroswap.buildFromQuote(quote, account);
  const xdr = (built as { xdr?: string }).xdr ?? (built as { transactionXdr?: string }).transactionXdr;
  if (!xdr) {
    console.error('FAIL: build returned no XDR');
    process.exit(1);
  }
  const tx = TransactionBuilder.fromXDR(xdr, stellar.networkPassphrase);
  tx.sign(kp);
  const sent = await soroswap.sendSignedXdr(tx.toXDR());
  log('send', sent);

  const balancesAfter = await stellar.getBalances(account);
  log('balances after', balancesAfter);

  console.log('\nPASS Soroswap swap', {
    pair: `USDC→XLM`,
    txHash: (sent as { txHash?: string }).txHash,
    route: quote,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
