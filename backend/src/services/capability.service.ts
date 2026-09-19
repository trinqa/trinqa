import type { AppConfig } from '../config/env.js';
import type { DefindexYieldAdapter } from '../adapters/defindex-yield.adapter.js';
import type { SoroswapAdapter } from '../adapters/soroswap.adapter.js';
import type { TrMockAnchorAdapter } from '../adapters/tr-mock-anchor.adapter.js';
import type { PolicyService } from './policy.service.js';
import { SoroswapAssetRegistry } from './soroswap-asset-registry.js';

export type PayoutRailStatus = 'available' | 'unavailable' | 'testnet_only';

export class CapabilityService {
  private readonly assetRegistry: SoroswapAssetRegistry;

  constructor(
    private readonly config: AppConfig,
    private readonly anchor: TrMockAnchorAdapter,
    private readonly defindex: DefindexYieldAdapter,
    private readonly soroswap: SoroswapAdapter,
    private readonly policy: PolicyService,
  ) {
    this.assetRegistry = new SoroswapAssetRegistry(soroswap);
  }

  async buildCapabilities() {
    const [anchorHealth, defindexHealth, soroswapHealth] = await Promise.all([
      this.anchor.health().catch(() => ({ ok: false, body: null })),
      this.defindex.healthCheck(),
      this.soroswap.healthCheck(),
    ]);

    const swapAssetsReady =
      soroswapHealth.ok &&
      this.soroswap.isConfigured &&
      (await this.assetRegistry.canSwap('USDC', 'XLM', this.config.USDC_ISSUER));

    return {
      version: '0.4.0',
      network: this.config.STELLAR_NETWORK,
      anchor: {
        domain: this.config.TR_ANCHOR_DOMAIN,
        protocol: 'sep6',
        healthy: anchorHealth.ok,
        asset: { code: 'USDC', issuer: this.config.USDC_ISSUER },
        seps: ['1', '6', '10', '12', '38'],
        payoutCurrencies: ['TRY'],
      },
      currencies: [
        {
          code: 'TRY',
          symbol: '₺',
          decimals: 2,
          canDeposit: anchorHealth.ok,
          canWithdraw: anchorHealth.ok,
          payoutRail: 'tr_mock_anchor' as const,
          status: 'testnet' as const,
        },
        {
          code: 'BRL',
          symbol: 'R$',
          decimals: 2,
          canDeposit: false,
          canWithdraw: false,
          payoutRail: null,
          status: 'unsupported' as const,
          reason: 'NO_SUPPORTED_PAYOUT_RAIL',
        },
        {
          code: 'USDC',
          symbol: 'USDC',
          decimals: 7,
          canDeposit: true,
          canWithdraw: true,
          payoutRail: 'stellar' as const,
          status: 'testnet' as const,
        },
      ],
      routes: {
        stellar_transfer: { status: 'available' as const },
        stellar_swap_transfer: {
          status: swapAssetsReady ? ('available' as const) : ('unavailable' as const),
        },
        fiat_payout: {
          status: anchorHealth.ok ? ('try_only' as const) : ('degraded' as const),
          supported: ['TRY'],
          unsupported: ['BRL', 'EUR'],
        },
      },
      features: {
        pay: anchorHealth.ok ? 'beta' : 'limited',
        earn: defindexHealth.configured ? (defindexHealth.ok ? 'beta' : 'degraded') : 'missing_vault_or_key',
        policyContract: {
          status: 'testnet',
          contractId: this.policy.adapter.contractId,
        },
        defindex: defindexHealth,
        soroswap: soroswapHealth,
        demoSigner: this.config.DEMO_SIGNER_ENABLED && Boolean(this.config.DEMO_SIGNER_SECRET?.startsWith('S')),
        earnUnwind: {
          mode: 'explicit',
          requiresPolicyAuthorization: false,
          silentUnwind: false,
        },
      },
    };
  }

  payoutRailFor(currency: string): { available: boolean; reason?: string } {
    const code = currency.toUpperCase();
    if (code === 'BRL') {
      return { available: false, reason: 'NO_SUPPORTED_PAYOUT_RAIL' };
    }
    if (code === 'TRY') {
      return { available: true };
    }
    if (code === 'USDC' || code === 'XLM') {
      return { available: true };
    }
    return { available: false, reason: 'ROUTE_UNAVAILABLE' };
  }
}
