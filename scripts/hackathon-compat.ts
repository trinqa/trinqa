#!/usr/bin/env npx tsx
/** Asset compatibility matrix for hackathon (no secrets). Exit 0 always (informational). */

import { getTrinqaUsdcIdentity } from '../backend/src/domain/trinqa-usdc.js';

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { SoroswapAdapter } = await import('../backend/src/adapters/soroswap.adapter.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');

  const identity = getTrinqaUsdcIdentity(env);
  console.log('\nTRINQA ASSET COMPATIBILITY MATRIX\n');
  console.log('Anchor USDC');
  console.log(`  code: ${identity.code}`);
  console.log(`  issuer: ${identity.issuer}`);
  console.log(`  SAC: ${identity.sacContractId}`);

  const defindex = new DefindexYieldAdapter(env);
  console.log('\nDeFindex');
  console.log(`  configured: ${defindex.isConfigured}`);
  console.log(`  vault: ${defindex.vaultAddress ?? '—'}`);
  let defindexMatch: 'MATCH' | 'MISMATCH' | 'UNKNOWN' = 'UNKNOWN';
  if (defindex.isConfigured) {
    try {
      await defindex.assertVaultAcceptsTrinqaUsdc();
      defindexMatch = 'MATCH';
    } catch {
      defindexMatch = 'MISMATCH';
    }
    try {
      const info = await defindex.getVaultInfo();
      console.log(`  vault assets: ${defindex.vaultAssetAddresses(info).join(', ') || '—'}`);
    } catch {
      console.log('  vault assets: (unavailable)');
    }
  }
  console.log(`  Trinqa USDC match: ${defindexMatch}`);

  const stellar = new StellarService(env);
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  console.log('\nSoroswap');
  console.log(`  configured: ${soroswap.isConfigured}`);
  let soroswapMatch: 'MATCH' | 'MISMATCH' | 'UNKNOWN' = 'UNKNOWN';
  if (soroswap.isConfigured) {
    try {
      const assets = await soroswap.discoverAssets();
      const list = Array.isArray(assets) ? assets : (assets as { assets?: unknown[] }).assets ?? [];
      const usdc = list.find((a) => {
        const row = a as Record<string, unknown>;
        return row.code === 'USDC' || row.symbol === 'USDC';
      }) as Record<string, unknown> | undefined;
      const contract = usdc?.contract ?? usdc?.contractId ?? usdc?.address;
      console.log(`  asset list loaded: yes (${list.length} assets)`);
      console.log(`  USDC contract in list: ${contract ?? 'not found'}`);
      if (typeof contract === 'string') {
        soroswapMatch = contract === identity.sacContractId ? 'MATCH' : 'MISMATCH';
        if (soroswapMatch === 'MISMATCH') {
          console.log('  SOROSWAP_TESTNET_USDC_FRAGMENTATION: anchor USDC ≠ Soroswap USDC');
        }
      }
    } catch (err) {
      console.log(`  asset list loaded: no (${err instanceof Error ? err.message : err})`);
    }
  }
  console.log(`  Trinqa USDC match: ${soroswapMatch}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
