import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const deploymentSchema = z.object({
  network: z.string(),
  contractId: z.string(),
  contractName: z.string(),
  wasmHash: z.string(),
  deployTxHash: z.string().optional().nullable(),
  installTxHash: z.string().optional().nullable(),
  deployedAt: z.string(),
  deployerPublicKey: z.string().optional(),
});

export type TestnetDeployment = z.infer<typeof deploymentSchema>;

let cached: TestnetDeployment | null = null;

export function loadTestnetDeployment(): TestnetDeployment {
  if (cached) {
    return cached;
  }
  const file = path.resolve(__dirname, '../../../deployments/testnet.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  cached = deploymentSchema.parse(raw);
  return cached;
}
