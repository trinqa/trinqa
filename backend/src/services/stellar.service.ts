import {
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  Horizon,
  rpc,
} from '@stellar/stellar-sdk';
import type { AppConfig } from '../config/env.js';
import { formatStellarAmount } from '../domain/money.js';

export type BalanceLine = {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
};

export class StellarService {
  readonly horizon: Horizon.Server;
  readonly rpc: rpc.Server;
  readonly networkPassphrase: string;
  readonly usdc: Asset;

  constructor(private readonly config: AppConfig) {
    this.horizon = new Horizon.Server(config.STELLAR_HORIZON_URL);
    this.rpc = new rpc.Server(config.STELLAR_RPC_URL);
    this.networkPassphrase = config.STELLAR_PASSPHRASE;
    this.usdc = new Asset(config.usdcAssetCode, config.USDC_ISSUER);
  }

  get isTestnet(): boolean {
    return this.config.STELLAR_NETWORK === 'testnet';
  }

  async friendbotFund(publicKey: string): Promise<{ funded: boolean; hash?: string }> {
    if (!this.isTestnet) {
      throw new Error('Friendbot is testnet-only');
    }
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Friendbot failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as { hash?: string };
    return { funded: true, hash: body.hash };
  }

  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizon.loadAccount(publicKey);
      return true;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return false;
      }
      throw err;
    }
  }

  async getBalances(publicKey: string): Promise<BalanceLine[]> {
    const account = await this.horizon.loadAccount(publicKey);
    return account.balances.map((b) => {
      if (b.asset_type === 'native') {
        return { assetType: 'native', balance: b.balance };
      }
      return {
        assetType: b.asset_type,
        assetCode: 'asset_code' in b ? b.asset_code : undefined,
        assetIssuer: 'asset_issuer' in b ? b.asset_issuer : undefined,
        balance: b.balance,
      };
    });
  }

  hasUsdcTrustline(balances: BalanceLine[]): boolean {
    return balances.some(
      (b) =>
        b.assetCode === this.config.usdcAssetCode &&
        b.assetIssuer === this.config.USDC_ISSUER,
    );
  }

  async buildPaymentXdr(
    sourcePublicKey: string,
    destinationPublicKey: string,
    amount: string,
    asset: Asset = this.usdc,
  ): Promise<string> {
    const account = await this.horizon.loadAccount(sourcePublicKey);
    const tx = new TransactionBuilder(account, {
      fee: String(await this.horizon.fetchBaseFee()),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset,
          amount: formatStellarAmount(amount),
        }),
      )
      .setTimeout(60)
      .build();
    return tx.toXDR();
  }

  async buildUsdcTrustlineXdr(publicKey: string, limit = '922337203685.4775807'): Promise<string> {
    const account = await this.horizon.loadAccount(publicKey);
    const tx = new TransactionBuilder(account, {
      fee: String(await this.horizon.fetchBaseFee()),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: this.usdc,
          limit: formatStellarAmount(limit),
        }),
      )
      .setTimeout(60)
      .build();
    return tx.toXDR();
  }

  async submitSignedXdr(signedXdr: string): Promise<{ hash: string; successful: boolean }> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const result = await this.horizon.submitTransaction(tx);
    return { hash: result.hash, successful: result.successful };
  }

  signXdr(unsignedXdr: string, secretKey: string): string {
    const kp = Keypair.fromSecret(secretKey);
    const tx = TransactionBuilder.fromXDR(unsignedXdr, this.networkPassphrase);
    tx.sign(kp);
    return tx.toXDR();
  }

  createRandomKeypair(): { publicKey: string; secretKey: string } {
    const kp = Keypair.random();
    return { publicKey: kp.publicKey(), secretKey: kp.secret() };
  }

  /** Health probe against Horizon + Soroban RPC. */
  async probeNetwork(): Promise<{ horizon: boolean; rpcLedger?: number }> {
    await this.horizon.fetchTimebounds(60);
    const health = await this.rpc.getHealth();
    return { horizon: true, rpcLedger: health.latestLedger };
  }

  static testnetPassphrase(): string {
    return Networks.TESTNET;
  }
}
