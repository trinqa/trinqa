#!/usr/bin/env npx tsx
/**
 * Trinqa backend lifecycle (testnet): anchor on-ramp, policy, optional DeFindex/Soroswap/payment legs.
 * Partner legs PASS only after real on-chain lifecycle (never build-only / health-only).
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initialPartnerLegStatus, isFullLifecyclePass } from './lib/e2e-trinqa-report.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

function runPartnerScript(script: string): boolean {
  const res = spawnSync('npx', ['tsx', join('scripts', script)], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  return res.status === 0;
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');
  const { buildApp } = await import('../backend/src/app.js');
  const { fundTestnetUsdcAccount } = await import('./lib/testnet-usdc-fixture.ts');
  const { toAtomic } = await import('../backend/src/domain/money.js');
  const { strategyIdForVault } = await import('../backend/src/domain/yield.js');

  const { report, blockers } = initialPartnerLegStatus(env);

  const deployment = loadTestnetDeployment();
  log('policy contract', { policyId: env.POLICY_CONTRACT_ID ?? deployment.contractId, wasmHash: deployment.wasmHash });

  const { app, stellar, anchor, defindex, paymentRouter, anchorSessions, execution } = await buildApp();

  const defindexConfigured = Boolean(env.DEFINDEX_API_KEY && env.DEFINDEX_VAULT_ADDRESS);
  const soroswapConfigured = Boolean(env.SOROSWAP_API_KEY);

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

    if (defindexConfigured) {
      report.DeFindex = runPartnerScript('e2e-defindex.ts') ? 'PASS' : 'FAIL';
    }

    if (soroswapConfigured) {
      report.Soroswap = runPartnerScript('e2e-soroswap.ts') ? 'PASS' : 'FAIL';
    }

    if (defindexConfigured && report.DeFindex === 'PASS') {
      try {
        const strategyId = strategyIdForVault(env.DEFINDEX_VAULT_ADDRESS!);
        const depositAmount = toAtomic('0.4000000', 7);
        const depositRes = await defindex.depositToVault(publicKey, [depositAmount], true);
        await defindex.sendSignedXdr(stellar.signXdr(depositRes.xdr, kp.secretKey));

        const recipient = stellar.createRandomKeypair().publicKey;
        await stellar.friendbotFund(recipient);

        const quote = await paymentRouter.quote({
          fromAccount: publicKey,
          recipient,
          sourceAmount: '0.3500000',
          sourceAssetCode: 'USDC',
          destinationCurrency: 'USDC',
          balanceSource: 'earn',
        });
        log('earn-funded quote', { funding: quote.funding, routeType: quote.routeType });

        if (!quote.funding?.requiresEarnUnwind) {
          report['Earn-funded payment'] = 'FAIL';
          log('earn-funded', 'expected requiresEarnUnwind after vault deposit');
        } else {
          await expectEarnApprovalRequired(paymentRouter, quote.quoteId, publicKey);

          const built = await paymentRouter.build(quote.quoteId, publicKey, true);
          const signedWithdraw = stellar.signXdr(built.unsignedXdr!, kp.secretKey);
          const afterWithdraw = await execution.executeStep(built.operationId, 'yield_withdraw', signedWithdraw);
          if (afterWithdraw.nextStep !== 'stellar_payment' || !afterWithdraw.unsignedXdr) {
            report['Earn-funded payment'] = 'FAIL';
            log('earn-funded', 'unexpected next step after yield_withdraw', afterWithdraw);
          } else {
            const payResult = await execution.executeStep(
              built.operationId,
              'stellar_payment',
              stellar.signXdr(afterWithdraw.unsignedXdr, kp.secretKey),
            );
            report['Earn-funded payment'] = payResult.successful ? 'PASS' : 'FAIL';
            log('earn-funded payment tx', payResult);
          }
        }
      } catch (err) {
        report['Earn-funded payment'] = 'FAIL';
        log('earn-funded error', err instanceof Error ? err.message : err);
      }
    } else if (defindexConfigured) {
      report['Earn-funded payment'] = report.DeFindex === 'BLOCKED' ? 'BLOCKED' : 'FAIL';
    }

    const withdrawDest = process.env.E2E_TRY_WITHDRAW_DEST ?? 'TR890009903460061605055303';
    try {
      await paymentRouter.quoteWithdrawToTry(
        publicKey,
        '0.0500000',
        session.sessionId,
        withdrawDest,
      );
      log('TRY withdraw quote', 'OK');
    } catch (err) {
      log('TRY withdraw quote', err instanceof Error ? err.message : err);
    }
  } finally {
    await app.close();
  }

  const fullLifecycle = isFullLifecyclePass(report);

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

async function expectEarnApprovalRequired(
  router: { build: (quoteId: string, from: string, approve?: boolean) => Promise<unknown> },
  quoteId: string,
  fromAccount: string,
) {
  try {
    await router.build(quoteId, fromAccount);
    throw new Error('build without approveEarnUnwind should have failed');
  } catch (err: unknown) {
    const code =
      (err as { code?: string }).code ??
      (err as { body?: { error?: { code?: string } } }).body?.error?.code;
    if (code !== 'EARN_UNWIND_APPROVAL_REQUIRED') {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
