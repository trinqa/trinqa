import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PublicEvidence = {
  run: string;
  network: string;
  timestamp: string;
  accounts?: Record<string, string>;
  contractIds?: Record<string, string>;
  quoteIds?: Record<string, string>;
  transferIds?: Record<string, string>;
  txHashes?: Record<string, string>;
  amounts?: Record<string, string>;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'BLOCKED';
  notes?: string[];
};

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const evidenceDir = path.join(repoRoot, 'backend/.data/hackathon-evidence');

export function saveEvidence(name: string, payload: PublicEvidence): string {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const file = path.join(evidenceDir, `${stamp}-${name}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

export function latestEvidenceFiles(limit = 20): string[] {
  if (!fs.existsSync(evidenceDir)) return [];
  return fs
    .readdirSync(evidenceDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(evidenceDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, limit);
}

export function evidenceDirPath(): string {
  return evidenceDir;
}
