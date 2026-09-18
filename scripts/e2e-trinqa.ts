#!/usr/bin/env npx tsx
/**
 * Trinqa backend lifecycle (testnet): anchor on-ramp, policy, optional DeFindex/Soroswap/payment legs.
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

type LegStatus = 'PASS' | 'BLOCKED' | 'FAIL' | 'PARTIAL';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');
  const { buildApp } = await import('../backend/src/app.js');
  const { fundTestnetUsdcAccount } = await import('./lib/testnet-usdc-fixture.ts');

  const report: Record<string, LegStatus> = {
    Anchor: 'FAIL',
    Policy: 'FAIL',
    DeFindex: 'BLOCKED',
    Soroswap: 'BLOCKED',
    'Earn-funded payment': 'BLOCKED',
  };

  const blockers: string[] = [];
  if (!env.DEFINDEX_API_KEY || !env.DEFINDEX_VAULT_ADDRESS) {
    blockers.push('DEFINDEX_API_KEY/DEFINDEX_VAULT_ADDRESS');
  } else {
    report.DeFindex = 'FAIL';
    report['Earn-funded payment'] = 'FAIL';
  }
  if (!env.SOROSWAP_API_KEY) {
    blockers.push('SOROSWAP_API_KEY');
  } else {
    report.Soroswap = 'FAIL';
  }

  const deployment = loadTestnetDeployment();
  log('policy contract', { policyId: env.POLICY_CONTRACT_ID ?? deployment.contractId, wasmHash: deployment.wasmHash });

  const { app, stellar, anchor, defindex, soroswap, paymentRouter, anchorSessions } = await buildApp();

  try {
    const kp = stellar.createRandomKeypair();
    const funded = await fundTestnetUsdcAccount({ stellar, anchor, env, keypair: kp });
    const publicKey = funded.publicKey;
    log('funded account', { publicKey, usdc: funded.usdcBalanceAfter });
    report.Anchor = 'PASS';

    const { token } = await anchor.sep10Authenticate(kp.secretKey);
    const session = anchorSessions.create(token, publicKey);

    const policyRead = await app.inject({ method: 'GET', url: `/api/v1/policy/${publicKey}` });
    report.Policy = policyRead.statusCode === 200 ? 'PASS' : 'FAIL';
    log('policy read', policyRead.json());

    if (defindex.isConfigured) {
      try {
        const vaultInfo = await defindex.getVaultInfo();
        log('defindex vault', vaultInfo);
        const depositBuild = await app.inject({
          method: 'POST',
          url: '/api/v1/yield/deposits/build',
          payload: {
            accountId: publicKey,
            strategyId: `defindex:${env.DEFINDEX_VAULT_ADDRESS}`,
            amount: '0.1000000',
            invest: true,
          },
        });
        if (depositBuild.statusCode !== 200) {
          report.DeFindex = 'FAIL';
          log('defindex deposit build', depositBuild.json());
        } else {
          report.DeFindex = 'PASS';
        }
      } catch (err) {
        report.DeFindex = 'FAIL';
        log('defindex error', err instanceof Error ? err.message : err);
      }
    }

    if (env.SOROSWAP_API_KEY && soroswap.isConfigured) {
      try {
        const health = await soroswap.healthCheck();
        report.Soroswap = health.ok ? 'PASS' : 'FAIL';
        log('soroswap health', health);
      } catch {
        report.Soroswap = 'FAIL';
      }
    }

    if (defindex.isConfigured && report.DeFindex === 'PASS') {
      try {
        const recipient = stellar.createRandomKeypair().publicKey;
        await stellar.friendbotFund(recipient);
        const quote = await paymentRouter.quote({
          fromAccount: publicKey,
          recipient,
          sourceAmount: '0.0500000',
          sourceAssetCode: 'USDC',
          destinationCurrency: 'USDC',
        });
        log('payment quote', { routeType: quote.routeType, funding: quote.funding });
        if (quote.funding?.requiresEarnUnwind) {
          report['Earn-funded payment'] = 'PARTIAL';
          blockers.push('earn unwind multi-step not exercised in trinqa e2e yet');
        } else {
          report['Earn-funded payment'] = 'PASS';
        }
      } catch (err) {
        report['Earn-funded payment'] = 'FAIL';
        log('payment quote error', err instanceof Error ? err.message : err);
      }
    }

    try {
      await paymentRouter.quoteWithdrawToTry(publicKey, '0.0500000', session.sessionId);
      log('TRY withdraw quote', 'OK');
    } catch (err) {
      log('TRY withdraw quote', err instanceof Error ? err.message : err);
    }
  } finally {
    await app.close();
  }

  const fullLifecycle =
    report.Anchor === 'PASS' &&
    report.Policy === 'PASS' &&
    report.DeFindex === 'PASS' &&
    report['Earn-funded payment'] === 'PASS';

  console.log('\nTRINQA TESTNET E2E');
  for (const [k, v] of Object.entries(report)) {
    const suffix = v === 'BLOCKED' ? ` — ${blockers.join('; ')}` : '';
    console.log(`${k}: ${v}${suffix}`);
  }
  console.log(`Full lifecycle: ${fullLifecycle ? 'PASS' : 'PARTIAL'}`);

  if (!fullLifecycle) {
    process.exit(3);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
