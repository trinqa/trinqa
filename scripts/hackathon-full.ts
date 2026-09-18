#!/usr/bin/env npx tsx
/** Full partner check sequence. Exit 0 PASS, 2 blocked, 3 partial. */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(repoRoot, 'backend');

function runScript(name: string): number {
  const res = spawnSync('npx', ['tsx', path.join('scripts', name)], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  return res.status ?? 1;
}

async function main() {
  const steps = [
    'hackathon-doctor.ts',
    'hackathon-compat.ts',
    'e2e-anchor.ts',
    'e2e-policy.ts',
    'e2e-defindex.ts',
    'e2e-soroswap.ts',
    'e2e-trinqa.ts',
  ];
  let blocked = false;
  let failed = false;
  for (const step of steps) {
    const code = runScript(step);
    if (code === 2) blocked = true;
    else if (code !== 0) failed = true;
  }
  if (failed) process.exit(1);
  if (blocked) process.exit(3);
  process.exit(0);
}

main();
