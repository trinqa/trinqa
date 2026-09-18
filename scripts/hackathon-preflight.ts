#!/usr/bin/env npx tsx
/**
 * Key-independent preflight. Exit 0 READY, 2 EXPECTED_EXTERNAL_BLOCKER, 1 failure.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(repoRoot, 'backend');

function run(cmd: string, args: string[], cwd: string): number {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  return res.status ?? 1;
}

async function secretScan(): Promise<boolean> {
  const res = spawnSync(
    'git',
    ['grep', '-E', 'S[A-Z0-9]{55}|sk_live|Bearer eyJ', '--', '.', ':!*.lock'],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (res.status === 0 && res.stdout) {
    console.error('Secret scan: potential matches (review)');
    return false;
  }
  return true;
}

async function main() {
  console.log('\nTRINQA HACKATHON PREFLIGHT\n');
  if (run('pnpm', ['build'], backendDir) !== 0) process.exit(1);
  if (run('pnpm', ['test'], backendDir) !== 0) process.exit(1);
  if (run('pnpm', ['test:integration'], backendDir) !== 0) process.exit(1);
  if (run('pnpm', ['verify'], backendDir) !== 0) process.exit(1);
  if (run('cargo', ['test'], path.join(repoRoot, 'contracts/trinqa-policy')) !== 0) process.exit(1);

  const { getTrinqaUsdcIdentity } = await import('../backend/src/domain/trinqa-usdc.js');
  const { env } = await import('../backend/src/config/env.js');
  console.log('USDC SAC', getTrinqaUsdcIdentity(env).sacContractId);

  if (!(await secretScan())) process.exit(1);

  const doctor = run('npx', ['tsx', '../scripts/hackathon-doctor.ts'], backendDir);
  if (doctor === 1) process.exit(1);

  const blockers: string[] = [];
  if (!env.DEFINDEX_API_KEY) blockers.push('DEFINDEX_API_KEY');
  if (!env.DEFINDEX_VAULT_ADDRESS) blockers.push('DEFINDEX_VAULT_ADDRESS');
  if (!env.SOROSWAP_API_KEY) blockers.push('SOROSWAP_API_KEY');

  if (blockers.length) {
    console.log('\nREADY (key-independent checks passed)');
    console.log('EXPECTED_EXTERNAL_BLOCKER:', blockers.join(', '));
    process.exit(2);
  }
  console.log('\nREADY');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
