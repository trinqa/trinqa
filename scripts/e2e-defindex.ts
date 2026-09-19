#!/usr/bin/env npx tsx
/**
 * DeFindex testnet deposit + partial withdraw lifecycle (USDC-funded account).
 * Exit 2 when DEFINDEX_API_KEY or DEFINDEX_VAULT_ADDRESS missing.
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

function assertProviderSend(result: unknown, label: string): string {
  const r = result as { success?: boolean; hash?: string; txHash?: string };
  if (r.success === false) throw new Error(`${label} provider reported failure`);
  const txHash = (r.txHash ?? r.hash)?.trim();
  if (!txHash) throw new Error(`${label} missing txHash`);
  return txHash;
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

  const usdcBefore = Number(
    (await stellar.getBalances(account)).find((b) => b.assetCode === 'USDC' && b.assetIssuer === env.USDC_ISSUER)
      ?.balance ?? 0,
  );
  const before = await adapter.getVaultBalance(account);
  const posBefore = await adapter.normalizePosition(
    account,
    (await import('../backend/src/domain/yield.js')).strategyIdForVault(env.DEFINDEX_VAULT_ADDRESS!),
  );
  log('balance before', { usdcAvailable: usdcBefore, vault: before, position: posBefore?.positionValue.amount });

  const depositAmount = toAtomic('0.5000000', 7);
  const depositRes = await adapter.depositToVault(account, [depositAmount], true);
  const depositSend = await adapter.sendSignedXdr(
    stellar.signXdr(depositRes.xdr, kp.secretKey),
  );
  log('deposit send', depositSend);
  const depositTxHash = assertProviderSend(depositSend, 'deposit');

  const usdcMid = Number(
    (await stellar.getBalances(account)).find((b) => b.assetCode === 'USDC' && b.assetIssuer === env.USDC_ISSUER)
      ?.balance ?? 0,
  );
  const mid = await adapter.getVaultBalance(account);
  const posMid = await adapter.normalizePosition(
    account,
    (await import('../backend/src/domain/yield.js')).strategyIdForVault(env.DEFINDEX_VAULT_ADDRESS!),
  );
  if (usdcMid >= usdcBefore || Number(posMid?.positionValue.amount ?? 0) <= Number(posBefore?.positionValue.amount ?? 0)) {
    console.error('FAIL: deposit did not decrease available USDC and increase vault position');
    process.exit(1);
  }
  log('balance after deposit', { usdcAvailable: usdcMid, vault: mid, position: posMid?.positionValue.amount });

  const withdrawAmount = toAtomic('0.1000000', 7);
  const withdrawRes = await adapter.withdrawFromVault(account, [withdrawAmount]);
  const withdrawSend = await adapter.sendSignedXdr(
    stellar.signXdr(withdrawRes.xdr, kp.secretKey),
  );
  log('withdraw send', withdrawSend);
  const withdrawTxHash = assertProviderSend(withdrawSend, 'withdraw');

  const usdcAfter = Number(
    (await stellar.getBalances(account)).find((b) => b.assetCode === 'USDC' && b.assetIssuer === env.USDC_ISSUER)
      ?.balance ?? 0,
  );
  const after = await adapter.getVaultBalance(account);
  const posAfter = await adapter.normalizePosition(
    account,
    (await import('../backend/src/domain/yield.js')).strategyIdForVault(env.DEFINDEX_VAULT_ADDRESS!),
  );
  if (usdcAfter <= usdcMid || Number(posAfter?.positionValue.amount ?? 0) >= Number(posMid?.positionValue.amount ?? 0)) {
    console.error('FAIL: withdraw did not increase available USDC and decrease vault position');
    process.exit(1);
  }
  log('balance after withdraw', { usdcAvailable: usdcAfter, vault: after, position: posAfter?.positionValue.amount });

  console.log('\nPASS DeFindex write lifecycle', {
    account,
    vault: env.DEFINDEX_VAULT_ADDRESS,
    depositTx: depositTxHash,
    withdrawTx: withdrawTxHash,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
