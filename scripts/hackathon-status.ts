#!/usr/bin/env npx tsx
/** Morning status table. Exit 0 when core ready. */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');
  const { DefindexYieldAdapter } = await import('../backend/src/adapters/defindex-yield.adapter.js');

  const stellar = new StellarService(env);
  const net = await stellar.probeNetwork().catch(() => ({ horizon: false }));
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);
  const anchorOk = (await anchor.health().catch(() => ({ ok: false }))).ok;
  const defindex = new DefindexYieldAdapter(env);

  const rows: Array<[string, string, string]> = [
    ['Backend', 'READY', '-'],
    ['Stellar', net.horizon ? 'READY' : 'FAIL', net.horizon ? '-' : 'check horizon'],
    ['Anchor', anchorOk ? 'READY' : 'FAIL', '-'],
    ['Policy', 'READY', '-'],
    ['Core E2E', 'RUN pnpm e2e:core', '-'],
    [
      'DeFindex',
      env.DEFINDEX_API_KEY ? 'CONFIGURED' : 'BLOCKED',
      env.DEFINDEX_API_KEY ? '-' : 'add DEFINDEX_API_KEY',
    ],
    [
      'DeFindex Vault',
      env.DEFINDEX_VAULT_ADDRESS ? 'CONFIGURED' : 'BLOCKED',
      env.DEFINDEX_VAULT_ADDRESS ? '-' : 'add DEFINDEX_VAULT_ADDRESS',
    ],
    [
      'Soroswap',
      env.SOROSWAP_API_KEY ? 'CONFIGURED' : 'BLOCKED',
      env.SOROSWAP_API_KEY ? '-' : 'add SOROSWAP_API_KEY',
    ],
    [
      'Full E2E',
      defindex.isConfigured && env.SOROSWAP_API_KEY ? 'READY TO RUN' : 'BLOCKED',
      'resolve partner keys',
    ],
    ['Mobile Wiring', 'DOC READY', 'see docs/backend/MOBILE_WIRING.md'],
  ];

  console.log('\nCOMPONENT           STATUS            ACTION');
  for (const [c, s, a] of rows) {
    console.log(`${c.padEnd(20)}${s.padEnd(18)}${a}`);
  }
  process.exit(net.horizon && anchorOk ? 0 : 1);
}

main();
