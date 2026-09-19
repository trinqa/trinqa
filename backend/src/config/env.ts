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
  /** Shared secret for /api/v1/demo/* (header x-demo-token). Required in production when the demo signer is on. */
  DEMO_ACCESS_TOKEN: optionalString,

  DEFINDEX_API_KEY: optionalString,
  DEFINDEX_API_URL: optionalUrl.default('https://api.defindex.io'),
  DEFINDEX_VAULT_ADDRESS: optionalString,
  /** Vault backed by a fixed-APR strategy (e.g. our testnet vault): report this rate, not the API's noisy APY. */
  DEFINDEX_FIXED_APR_BPS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10_000).optional()),

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
    throw new Error('Trinqa backend is testnet-only');
  }

  const data = parsed.data;
  if (data.DEMO_SIGNER_ENABLED && data.STELLAR_NETWORK !== 'testnet') {
    throw new Error('Demo signer is forbidden outside testnet');
  }
  assertDemoAccessConfigured(data);
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

/** A publicly reachable demo signer must not sign for anyone who finds the URL. */
export function assertDemoAccessConfigured(config: {
  NODE_ENV: string;
  DEMO_SIGNER_ENABLED: boolean;
  DEMO_ACCESS_TOKEN?: string;
}): void {
  if (config.NODE_ENV === 'production' && config.DEMO_SIGNER_ENABLED && !config.DEMO_ACCESS_TOKEN) {
    throw new Error('DEMO_ACCESS_TOKEN is required when DEMO_SIGNER_ENABLED=true in production');
  }
}

export const env = parseEnv();

export function isDemoSignerAvailable(): boolean {
  return env.DEMO_SIGNER_ENABLED && Boolean(env.DEMO_SIGNER_SECRET?.startsWith('S'));
}

/** Resolve operations persistence directory (never empty string). */
export function resolveOperationsDataDir(config: AppConfig = env): string {
  return config.OPERATIONS_DATA_DIR ?? path.resolve(process.cwd(), '.data');
}
