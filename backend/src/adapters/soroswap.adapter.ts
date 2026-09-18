import { SoroswapSDK, SupportedNetworks, SupportedProtocols, TradeType } from '@soroswap/sdk';
import type { QuoteResponse } from '@soroswap/sdk';
import type { AppConfig } from '../config/env.js';
import { Networks, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';

export type SoroswapHealth = {
  ok: boolean;
  configured: boolean;
  protocols?: string[];
  error?: string;
};

export class SoroswapAdapter {
  private readonly sdk: SoroswapSDK | null;
  readonly network = SupportedNetworks.TESTNET;

  constructor(
    private readonly config: AppConfig,
    private readonly networkPassphrase: string,
  ) {
    if (config.SOROSWAP_API_KEY) {
      this.sdk = new SoroswapSDK({
        apiKey: config.SOROSWAP_API_KEY,
        baseUrl: config.SOROSWAP_API_URL,
        defaultNetwork: SupportedNetworks.TESTNET,
      });
    } else {
      this.sdk = null;
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.sdk);
  }

  requireSdk(): SoroswapSDK {
    if (!this.sdk) {
      throw new Error('SOROSWAP_API_KEY is not configured');
    }
    return this.sdk;
  }

  async healthCheck(): Promise<SoroswapHealth> {
    if (!this.sdk) {
      return { ok: false, configured: false, error: 'missing_api_key' };
    }
    try {
      const protocols = await this.sdk.getProtocols(this.network);
      return { ok: true, configured: true, protocols };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, configured: true, error: message };
    }
  }

  async discoverAssets() {
    const sdk = this.requireSdk();
    return sdk.getAssetList();
  }

  async quoteExactIn(params: {
    assetIn: string;
    assetOut: string;
    amountIn: bigint;
    slippageBps?: number;
  }) {
    const sdk = this.requireSdk();
    return sdk.quote(
      {
        assetIn: params.assetIn,
        assetOut: params.assetOut,
        amount: params.amountIn,
        tradeType: TradeType.EXACT_IN,
        slippageBps: params.slippageBps ?? 50,
        protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
      },
      this.network,
    );
  }

  async quoteExactOut(params: {
    assetIn: string;
    assetOut: string;
    amountOut: bigint;
    slippageBps?: number;
  }) {
    const sdk = this.requireSdk();
    return sdk.quote(
      {
        assetIn: params.assetIn,
        assetOut: params.assetOut,
        amount: params.amountOut,
        tradeType: TradeType.EXACT_OUT,
        slippageBps: params.slippageBps ?? 50,
        protocols: [SupportedProtocols.SOROSWAP, SupportedProtocols.AQUA],
      },
      this.network,
    );
  }

  async buildFromQuote(quote: QuoteResponse, from: string) {
    const sdk = this.requireSdk();
    return sdk.build({ quote, from }, this.network);
  }

  parseUnsignedXdr(xdr: string): Transaction {
    const net = this.networkPassphrase.includes('Test') ? Networks.TESTNET : Networks.PUBLIC;
    return TransactionBuilder.fromXDR(xdr, net) as Transaction;
  }

  async sendSignedXdr(signedXdr: string) {
    const sdk = this.requireSdk();
    return sdk.send(signedXdr, this.network);
  }
}
