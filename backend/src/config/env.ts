import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  DEMO_SIGNER_SECRET: z.string().optional(),

  DEFINDEX_API_KEY: z.string().optional(),
  SOROSWAP_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema> & {
  usdcAssetCode: 'USDC';
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

  return {
    ...parsed.data,
    usdcAssetCode: 'USDC',
  };
}

export const env = parseEnv();

export function isDemoSignerAvailable(): boolean {
  return env.DEMO_SIGNER_ENABLED && Boolean(env.DEMO_SIGNER_SECRET?.startsWith('S'));
}
