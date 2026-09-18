#!/usr/bin/env npx tsx
/**
 * DeFindex testnet deposit + partial withdraw lifecycle.
 * Exit 2 when DEFINDEX_API_KEY or DEFINDEX_VAULT_ADDRESS missing.
 */

import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');
  const { toAtomic } = await import('../backend/src/domain/money.js');

  const blockers: string[] = [];
  if (!env.DEFINDEX_API_KEY) blockers.push('DEFINDEX_API_KEY');
  if (!env.DEFINDEX_VAULT_ADDRESS) blockers.push('DEFINDEX_VAULT_ADDRESS');
  if (blockers.length) {
    console.error('BLOCKED:', blockers.join(', '));
    process.exit(2);
  }

  const stellar = new StellarService(env);
  const adapter = new DefindexYieldAdapter(env);
  const kp = Keypair.random();
  const account = kp.publicKey();
  await stellar.friendbotFund(account);
  const trust = await stellar.buildUsdcTrustlineXdr(account);
  await stellar.submitSignedXdr(stellar.signXdr(trust, kp.secret()));

  log('health', await adapter.healthCheck());
  const vaultInfo = await adapter.getVaultInfo();
  log('vault info', vaultInfo);

  const before = await adapter.getVaultBalance(account);
  log('balance before', before);

  const depositAmount = toAtomic('0.5000000', 7);
  const depositRes = await adapter.depositToVault(account, [depositAmount], true);
  const depositTx = TransactionBuilder.fromXDR(depositRes.xdr, stellar.networkPassphrase);
  depositTx.sign(kp);
  const depositSend = await adapter.sendSignedXdr(depositTx.toXDR());
  log('deposit send', depositSend);

  const mid = await adapter.getVaultBalance(account);
  log('balance after deposit', mid);

  const withdrawAmount = toAtomic('0.1000000', 7);
  const withdrawRes = await adapter.withdrawFromVault(account, [withdrawAmount]);
  const withdrawTx = TransactionBuilder.fromXDR(withdrawRes.xdr, stellar.networkPassphrase);
  withdrawTx.sign(kp);
  const withdrawSend = await adapter.sendSignedXdr(withdrawTx.toXDR());
  log('withdraw send', withdrawSend);

  const after = await adapter.getVaultBalance(account);
  log('balance after withdraw', after);

  console.log('\nPASS DeFindex write lifecycle', {
    account,
    vault: env.DEFINDEX_VAULT_ADDRESS,
    depositTx: (depositSend as { txHash?: string }).txHash,
    withdrawTx: (withdrawSend as { txHash?: string }).txHash,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
