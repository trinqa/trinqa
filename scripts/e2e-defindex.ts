#!/usr/bin/env npx tsx
/**
 * DeFindex testnet smoke — exits BLOCKED without DEFINDEX_API_KEY + DEFINDEX_VAULT_ADDRESS.
 */

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');

  const blockers: string[] = [];
  if (!env.DEFINDEX_API_KEY) blockers.push('DEFINDEX_API_KEY');
  if (!env.DEFINDEX_VAULT_ADDRESS) blockers.push('DEFINDEX_VAULT_ADDRESS');

  if (blockers.length) {
    console.error('BLOCKED:', blockers.join(', '));
    process.exit(2);
  }

  const adapter = new DefindexYieldAdapter(env);
  log('health', await adapter.healthCheck());
  log('vault info', await adapter.getVaultInfo());
  log('vault apy', await adapter.getVaultAPY());
  log('done', 'e2e-defindex OK (read-only)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
