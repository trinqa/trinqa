#!/usr/bin/env npx tsx
/**
 * Policy contract smoke (testnet).
 * Run: pnpm --dir backend e2e:policy
 */

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { PolicyService } = await import('../backend/src/services/policy.service.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');

  const deployment = loadTestnetDeployment();
  log('config', {
    network: env.STELLAR_NETWORK,
    contractId: deployment.contractId,
    wasmHash: deployment.wasmHash,
  });

  const stellar = new StellarService(env);
  const policy = new PolicyService(env, stellar);

  const { publicKey, secretKey } = stellar.createRandomKeypair();
  log('create account', { publicKey });
  await stellar.friendbotFund(publicKey);

  const targetTimestamp = BigInt(Math.floor(Date.now() / 1000) + 172_800);
  log('build set_policy');
  const built = await policy.buildTransaction({
    action: 'set_policy',
    accountId: publicKey,
    policy: {
      riskProfile: 0,
      targetTimestamp,
      liquidityTargetBps: 3_000,
      automationPaused: false,
      allowedStrategies: ['defindex', 'soroswap'],
    },
  });

  log('sign + submit');
  const signed = stellar.signXdr(built.unsignedXdr, secretKey);
  console.log(await policy.submitSignedPolicyTx(signed));

  log('get policy');
  console.log(await policy.getPolicy(publicKey));

  log('done', 'e2e-policy OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
