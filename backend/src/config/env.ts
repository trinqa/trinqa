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
  /** Comma-separated home domains for read-only SEP anchor discovery (Phase 2 anchor directory). */
  ANCHOR_DISCOVERY_DOMAINS: optionalString,

  DEMO_SIGNER_ENABLED: z
    .preprocess((v) => emptyToUndefined(v) ?? 'false', z.enum(['true', 'false']))
    .transform((v) => v === 'true'),
  DEMO_SIGNER_SECRET: optionalString,
  /** Shared secret for /api/v1/demo/* (header x-demo-token). Required in production when the demo signer is on. */
  DEMO_ACCESS_TOKEN: optionalString,
  /** Master secret for per-device custodial testnet wallets; derived from DEMO_SIGNER_SECRET when unset. */
  WALLET_MASTER_SECRET: optionalString,

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

  /** Managed PostgreSQL for durable signups. Without it the waitlist falls back to a JSON file. */
  DATABASE_URL: optionalString,
  /** Shared secret for GET /api/v1/waitlist/export (header x-waitlist-token). Export is off when unset. */
  WAITLIST_ADMIN_TOKEN: optionalString,
  /** Extra browser origins allowed to call the API, comma separated. Added to the built-in list. */
  CORS_ORIGINS: optionalString,

  /** Horizon poller that notices incoming USDC while the app is closed. Defaults on outside tests. */
  PUSH_WATCHER_ENABLED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  PUSH_WATCHER_INTERVAL_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).optional(),
  ),

  /** Jev route advisor (Phase 2, workstream C) — reached via OpenRouter's alpha Decisions API. */
  OPENROUTER_API_KEY: optionalString,
  JEV_MODEL: optionalString,
  JEV_ENABLED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  JEV_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  JEV_MIN_CONFIDENCE: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(1).optional()),
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

/**
 * The watcher polls Horizon on a timer, so it stays off under tests unless a test asks for it:
 * tests drive a tick directly instead.
 */
export function isPushWatcherEnabled(config: AppConfig = env): boolean {
  if (config.PUSH_WATCHER_ENABLED !== undefined) return config.PUSH_WATCHER_ENABLED === 'true';
  return config.NODE_ENV !== 'test';
}

/** Resolve operations persistence directory (never empty string). */
export function resolveOperationsDataDir(config: AppConfig = env): string {
  return config.OPERATIONS_DATA_DIR ?? path.resolve(process.cwd(), '.data');
}

/** The public site is a different origin from the API, so it has to be named here. */
const DEFAULT_CORS_ORIGINS = [
  'https://trinqa.com',
  'https://www.trinqa.com',
  'https://trinqalanding-8080-un6zlvawfa.outplane.app',
];

/**
 * Browser origins allowed to call the API: the production site, anything listed in
 * CORS_ORIGINS, and any localhost port for development.
 */
export function resolveCorsOrigins(config: AppConfig = env): Array<string | RegExp> {
  const extra = (config.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const exact = [...new Set([...DEFAULT_CORS_ORIGINS, ...extra])];
  return [...exact, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
}
