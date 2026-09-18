#!/usr/bin/env npx tsx
/**
 * DeFindex testnet deposit + partial withdraw lifecycle (USDC-funded account).
 * Exit 2 when DEFINDEX_API_KEY or DEFINDEX_VAULT_ADDRESS missing.
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');
  const { toAtomic } = await import('../backend/src/domain/money.js');
  const { fundTestnetUsdcAccount } = await import('./lib/testnet-usdc-fixture.ts');

  const blockers: string[] = [];
  if (!env.DEFINDEX_API_KEY) blockers.push('DEFINDEX_API_KEY');
  if (!env.DEFINDEX_VAULT_ADDRESS) blockers.push('DEFINDEX_VAULT_ADDRESS');
  if (blockers.length) {
    console.error('BLOCKED:', blockers.join(', '));
    process.exit(2);
  }

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const adapter = new DefindexYieldAdapter(env);
  const kp = stellar.createRandomKeypair();
  const funded = await fundTestnetUsdcAccount({
    stellar,
    anchor,
    env,
    keypair: kp,
  });
  const account = funded.publicKey;
  log('USDC funded account', { account, usdcBalance: funded.usdcBalanceAfter });

  log('health', await adapter.healthCheck());
  log('vault info', await adapter.getVaultInfo());

  const before = await adapter.getVaultBalance(account);
  log('balance before', before);

  const depositAmount = toAtomic('0.5000000', 7);
  const depositRes = await adapter.depositToVault(account, [depositAmount], true);
  const depositSend = await adapter.sendSignedXdr(
    stellar.signXdr(depositRes.xdr, kp.secretKey),
  );
  log('deposit send', depositSend);

  const mid = await adapter.getVaultBalance(account);
  log('balance after deposit', mid);

  const withdrawAmount = toAtomic('0.1000000', 7);
  const withdrawRes = await adapter.withdrawFromVault(account, [withdrawAmount]);
  const withdrawSend = await adapter.sendSignedXdr(
    stellar.signXdr(withdrawRes.xdr, kp.secretKey),
  );
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
