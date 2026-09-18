import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyToUndefined, optionalString, optionalUrl } from './env-normalize.js';
import { loadTestnetDeployment } from './deployments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  STELLAR_PASSPHRASE: z
    .string()
    .default('Test SDF Network ; September 2015'),

  TR_ANCHOR_DOMAIN: z.string().default('tr-mock-anchor.fly.dev'),
  USDC_ISSUER: z
    .string()
    .default('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),

  DEMO_SIGNER_ENABLED: z
    .preprocess((v) => emptyToUndefined(v) ?? 'false', z.enum(['true', 'false']))
    .transform((v) => v === 'true'),
  DEMO_SIGNER_SECRET: optionalString,

  DEFINDEX_API_KEY: optionalString,
  DEFINDEX_API_URL: optionalUrl.default('https://api.defindex.io'),
  DEFINDEX_VAULT_ADDRESS: optionalString,

  SOROSWAP_API_KEY: optionalString,
  SOROSWAP_API_URL: optionalUrl.default('https://api.soroswap.finance'),

  TRINQA_POLICY_CONTRACT_ID: optionalString,
  POLICY_CONTRACT_ID: optionalString,
  POLICY_WASM_HASH: optionalString,

  OPERATIONS_DATA_DIR: optionalString,
});

export type AppConfig = z.infer<typeof envSchema> & {
  usdcAssetCode: 'USDC';
  POLICY_CONTRACT_ID?: string;
  POLICY_WASM_HASH?: string;
};

function parseEnv(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }

  if (parsed.data.STELLAR_NETWORK !== 'testnet') {
    throw new Error('Trinqa backend Phase 1 is testnet-only');
  }

  const data = parsed.data;
  if (data.DEMO_SIGNER_ENABLED && data.STELLAR_NETWORK !== 'testnet') {
    throw new Error('Demo signer is forbidden outside testnet');
  }
  let policyContractId = data.TRINQA_POLICY_CONTRACT_ID ?? data.POLICY_CONTRACT_ID;
  let policyWasmHash = data.POLICY_WASM_HASH;
  if (!policyContractId || !policyWasmHash) {
    try {
      const deployment = loadTestnetDeployment();
      policyContractId = policyContractId ?? deployment.contractId;
      policyWasmHash = policyWasmHash ?? deployment.wasmHash;
    } catch {
      // deployments file optional during partial setup
    }
  }

  const operationsDataDir =
    data.OPERATIONS_DATA_DIR ??
    path.resolve(__dirname, '../../.data');

  return {
    ...data,
    POLICY_CONTRACT_ID: policyContractId,
    POLICY_WASM_HASH: policyWasmHash,
    OPERATIONS_DATA_DIR: operationsDataDir,
    usdcAssetCode: 'USDC',
  };
}

export const env = parseEnv();

export function isDemoSignerAvailable(): boolean {
  return env.DEMO_SIGNER_ENABLED && Boolean(env.DEMO_SIGNER_SECRET?.startsWith('S'));
}

/** Resolve operations persistence directory (never empty string). */
export function resolveOperationsDataDir(config: AppConfig = env): string {
  return config.OPERATIONS_DATA_DIR ?? path.resolve(process.cwd(), '.data');
}
