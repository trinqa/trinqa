import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import type { PolicyService } from '../../services/policy.service.js';

/** Stub aligned with mobile capability shapes; expanded in later milestones. */
export function registerCapabilitiesRoutes(app: FastifyInstance, policy: PolicyService): void {
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
      policyContract: {
        status: 'testnet',
        contractId: policy.adapter.contractId,
      },
      defindex: env.DEFINDEX_API_KEY ? 'configured' : 'missing_api_key',
      soroswap: env.SOROSWAP_API_KEY ? 'configured' : 'missing_api_key',
      demoSigner: env.DEMO_SIGNER_ENABLED,
    },
  }));
}
