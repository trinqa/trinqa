import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';

/** Stub aligned with mobile capability shapes; expanded in later milestones. */
export function registerCapabilitiesRoutes(app: FastifyInstance): void {
  app.get('/api/v1/capabilities', async () => ({
    version: '0.1.0',
    network: env.STELLAR_NETWORK,
    anchor: {
      domain: env.TR_ANCHOR_DOMAIN,
      protocol: 'sep6',
      asset: {
        code: 'USDC',
        issuer: env.USDC_ISSUER,
      },
      seps: ['1', '6', '10', '12', '38'],
    },
    currencies: [
      {
        code: 'TRY',
        symbol: '₺',
        decimals: 2,
        canDeposit: true,
        canWithdraw: true,
        status: 'testnet',
      },
      {
        code: 'USDC',
        symbol: 'USDC',
        decimals: 7,
        canDeposit: true,
        canWithdraw: true,
        status: 'testnet',
      },
    ],
    features: {
      pay: 'planned',
      earn: 'planned',
      policyContract: 'planned',
      defindex: env.DEFINDEX_API_KEY ? 'configured' : 'missing_api_key',
      soroswap: env.SOROSWAP_API_KEY ? 'configured' : 'missing_api_key',
      demoSigner: env.DEMO_SIGNER_ENABLED,
    },
  }));
}
