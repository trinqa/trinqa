#!/usr/bin/env npx tsx
import fs from 'node:fs';
import { latestEvidenceFiles, evidenceDirPath } from './lib/evidence.ts';

async function main() {
  const files = latestEvidenceFiles(10);
  if (!files.length) {
    console.log('No evidence files in', evidenceDirPath());
    process.exit(0);
  }
  let md = '# Trinqa hackathon evidence (sanitized)\n\n';
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    md += `## ${pathBasename(file)}\n\n`;
    md += '```json\n' + JSON.stringify(data, null, 2) + '\n```\n\n';
  }
  const out = `${evidenceDirPath()}/LATEST.md`;
  fs.writeFileSync(out, md);
  console.log(md);
  console.log('Wrote', out);
}

function pathBasename(p: string): string {
  return p.split('/').pop() ?? p;
}

main();
