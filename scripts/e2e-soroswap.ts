#!/usr/bin/env npx tsx
/**
 * Soroswap testnet smoke — exits BLOCKED without SOROSWAP_API_KEY.
 */

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { SoroswapAdapter } = await import('../backend/src/adapters/soroswap.adapter.js');

  if (!env.SOROSWAP_API_KEY) {
    console.error('BLOCKED: SOROSWAP_API_KEY');
    process.exit(2);
  }

  const stellar = new StellarService(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  log('health', await soroswap.healthCheck());
  log('assets', await soroswap.discoverAssets());
  log('done', 'e2e-soroswap OK (discovery)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
