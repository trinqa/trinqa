#!/usr/bin/env npx tsx
/** Read-only hackathon environment doctor. Exit 1 on infra FAIL, 2 on external blockers only. */

import { getTrinqaUsdcIdentity } from '../backend/src/domain/trinqa-usdc.js';

type Row = { label: string; status: string; action?: string };

async function main() {
  const rows: Row[] = [];
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');
  const { SoroswapAdapter } = await import('../backend/src/adapters/soroswap.adapter.js');
  const { PolicyService } = await import('../backend/src/services/policy.service.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');

  const nodeOk = Number(process.version.slice(1).split('.')[0]) >= 22;
  rows.push({ label: 'Node 22+', status: nodeOk ? 'OK' : 'FAIL', action: nodeOk ? undefined : 'nvm use 22' });

  const stellar = new StellarService(env);
  const net = await stellar.probeNetwork().catch(() => ({ horizon: false }));
  rows.push({ label: 'Stellar Horizon', status: net.horizon ? 'REACHABLE' : 'UNREACHABLE' });

  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const anchorHealth = await anchor.health().catch(() => ({ ok: false }));
  rows.push({ label: 'TR Anchor', status: anchorHealth.ok ? 'HEALTHY' : 'UNHEALTHY' });

  const deployment = loadTestnetDeployment();
  const policy = new PolicyService(env, stellar);
  const policyMatched = policy.adapter.contractId === deployment.contractId;
  rows.push({
    label: 'Policy Contract',
    status: policyMatched ? 'MATCHED' : 'MISMATCH',
  });

  rows.push({
    label: 'DeFindex API Key',
    status: env.DEFINDEX_API_KEY ? 'PRESENT' : 'MISSING',
    action: env.DEFINDEX_API_KEY ? undefined : 'add DEFINDEX_API_KEY',
  });
  rows.push({
    label: 'DeFindex Vault',
    status: env.DEFINDEX_VAULT_ADDRESS ? 'CONFIGURED' : 'MISSING',
  });

  const defindex = new DefindexYieldAdapter(env);
  let vaultStatus = 'UNCONFIGURED';
  if (defindex.isConfigured) {
    try {
      await defindex.assertVaultAcceptsTrinqaUsdc();
      vaultStatus = 'VALID';
    } catch (err) {
      vaultStatus = err instanceof Error && err.message.includes('MISMATCH') ? 'ASSET_MISMATCH' : 'INVALID';
    }
  }
  rows.push({ label: 'DeFindex Vault Asset', status: vaultStatus });

  rows.push({
    label: 'Soroswap API Key',
    status: env.SOROSWAP_API_KEY ? 'PRESENT' : 'MISSING',
  });
  const soroswap = new SoroswapAdapter(env, stellar.networkPassphrase);
  const soroswapHealth = await soroswap.healthCheck();
  rows.push({
    label: 'Soroswap API',
    status: !env.SOROSWAP_API_KEY ? 'UNCONFIGURED' : soroswapHealth.ok ? 'HEALTHY' : 'AUTH_FAIL',
  });

  const identity = getTrinqaUsdcIdentity(env);
  rows.push({ label: 'Trinqa USDC SAC', status: identity.sacContractId.slice(0, 12) + '…' });

  rows.push({ label: 'Core E2E Ready', status: anchorHealth.ok && net.horizon ? 'YES' : 'NO' });
  rows.push({
    label: 'Full Trinqa E2E Ready',
    status: defindex.isConfigured && soroswap.isConfigured && vaultStatus === 'VALID' ? 'YES' : 'NO',
  });

  console.log('\nTRINQA HACKATHON DOCTOR\n');
  for (const r of rows) {
    console.log(`${r.label}: ${r.status}${r.action ? ` (${r.action})` : ''}`);
  }

  const infraFail =
    !nodeOk || !net.horizon || !anchorHealth.ok || !policyMatched;
  const externalOnly =
    !infraFail &&
    (!env.DEFINDEX_API_KEY || !env.SOROSWAP_API_KEY || vaultStatus !== 'VALID');
  process.exit(infraFail ? 1 : externalOnly ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
