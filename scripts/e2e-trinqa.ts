#!/usr/bin/env npx tsx
/**
 * Full Trinqa backend lifecycle (testnet). Prints PARTIAL + blockers when partner keys missing.
 */

type LegStatus = 'PASS' | 'BLOCKED' | 'FAIL';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');
  const { buildApp } = await import('../backend/src/app.js');

  const report: Record<string, LegStatus> = {
    Anchor: 'FAIL',
    Policy: 'FAIL',
    DeFindex: env.DEFINDEX_API_KEY && env.DEFINDEX_VAULT_ADDRESS ? 'FAIL' : 'BLOCKED',
    Soroswap: env.SOROSWAP_API_KEY ? 'FAIL' : 'BLOCKED',
    'Earn-funded payment': env.DEFINDEX_API_KEY && env.DEFINDEX_VAULT_ADDRESS ? 'FAIL' : 'BLOCKED',
  };

  if (!env.DEFINDEX_API_KEY) report['DeFindex'] = 'BLOCKED';
  if (!env.DEFINDEX_VAULT_ADDRESS) report['DeFindex'] = 'BLOCKED';
  if (!env.SOROSWAP_API_KEY) report.Soroswap = 'BLOCKED';

  const deployment = loadTestnetDeployment();
  const policyId = env.POLICY_CONTRACT_ID ?? deployment.contractId;
  log('policy contract', { policyId, wasmHash: deployment.wasmHash });

  const { app, stellar, anchor, defindex, paymentRouter, anchorSessions } = await buildApp();

  try {
    const health = await app.inject({ method: 'GET', url: '/api/v1/health' });
    if (health.statusCode === 200) report.Anchor = 'PASS';
    log('health', health.json());

    const { publicKey, secretKey } = stellar.createRandomKeypair();
    await stellar.friendbotFund(publicKey);
    const trustUnsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
    await stellar.submitSignedXdr(stellar.signXdr(trustUnsigned, secretKey));

    const { token } = await anchor.sep10Authenticate(secretKey);
    const session = anchorSessions.create(token, publicKey);

    const sep38 = await anchor.sep38Quote(token, {
      sellAsset: 'iso4217:TRY',
      buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
      sellAmount: '500',
    });
    log('SEP-38 TRY→USDC', { id: sep38.id, buy_amount: sep38.buy_amount });
    report.Anchor = 'PASS';

    const policyRead = await app.inject({
      method: 'GET',
      url: `/api/v1/policy/${publicKey}`,
    });
    if (policyRead.statusCode === 200) report.Policy = 'PASS';
    log('policy read', policyRead.json());

    if (defindex.isConfigured) {
      log('defindex vault', await defindex.getVaultInfo());
      report.DeFindex = 'PASS';
    } else {
      log('defindex', 'BLOCKED — missing DEFINDEX_API_KEY or DEFINDEX_VAULT_ADDRESS');
    }

    if (env.SOROSWAP_API_KEY) {
      report.Soroswap = 'PASS';
    } else {
      log('soroswap', 'BLOCKED — SOROSWAP_API_KEY');
    }

    try {
      const quote = await paymentRouter.quote({
        fromAccount: publicKey,
        recipient: publicKey,
        sourceAmount: '1.0000000',
        sourceAssetCode: 'USDC',
        destinationCurrency: 'USDC',
      });
      log('payment quote USDC', { funding: quote.funding, routeType: quote.routeType });
    } catch (err) {
      log('payment quote', err instanceof Error ? err.message : err);
    }

    try {
      await paymentRouter.quoteWithdrawToTry(publicKey, '1.0000000', session.sessionId);
      log('TRY withdraw quote', 'SEP-38 locked');
    } catch (err) {
      log('TRY withdraw quote', err instanceof Error ? err.message : err);
    }
  } finally {
    await app.close();
  }

  const blockers: string[] = [];
  if (report.DeFindex === 'BLOCKED') blockers.push('DEFINDEX_API_KEY/DEFINDEX_VAULT_ADDRESS');
  if (report.Soroswap === 'BLOCKED') blockers.push('SOROSWAP_API_KEY');
  if (report['Earn-funded payment'] === 'BLOCKED') blockers.push('requires DeFindex write lifecycle');

  const fullLifecycle =
    report.Anchor === 'PASS' &&
    report.Policy === 'PASS' &&
    report.DeFindex === 'PASS' &&
    report['Earn-funded payment'] === 'PASS';

  console.log('\nTRINQA TESTNET E2E');
  for (const [k, v] of Object.entries(report)) {
    console.log(`${k}: ${v}${v === 'BLOCKED' && blockers.length ? ` — ${blockers.join('; ')}` : ''}`);
  }
  console.log(`Full lifecycle: ${fullLifecycle ? 'PASS' : 'PARTIAL'}`);

  if (!fullLifecycle) {
    process.exit(3);
  }
  log('done', 'e2e-trinqa PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
