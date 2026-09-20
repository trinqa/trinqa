import { createHmac, randomBytes } from 'node:crypto';
import { Keypair, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import type { StellarService } from './stellar.service.js';

/**
 * Who signs for an account. The app only ever asks "sign this for my account";
 * today the backend holds the key (testnet custodial demo), later a passkey
 * smart wallet or an MPC provider can sit behind the same seam.
 */
export interface AccountSigner {
  readonly publicKey: string;
  signXdr(unsignedXdr: string): string;
  signTransaction(tx: Transaction): void;
}

class KeypairSigner implements AccountSigner {
  readonly publicKey: string;

  constructor(
    private readonly keypair: Keypair,
    private readonly networkPassphrase: string,
  ) {
    this.publicKey = keypair.publicKey();
  }

  signXdr(unsignedXdr: string): string {
    const tx = TransactionBuilder.fromXDR(unsignedXdr, this.networkPassphrase);
    if (!(tx instanceof Transaction)) {
      throw new Error('unsignedXdr must be a transaction envelope');
    }
    tx.sign(this.keypair);
    return tx.toXDR();
  }

  signTransaction(tx: Transaction): void {
    tx.sign(this.keypair);
  }
}

/** 32 random bytes, base64url: the device's only credential for its wallet. */
const WALLET_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isWalletKey(value: unknown): value is string {
  return typeof value === 'string' && WALLET_KEY_PATTERN.test(value);
}

/** Contact ids come from the app's seeded contact list, e.g. "ana-souza". */
const CONTACT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isContactId(value: unknown): value is string {
  return typeof value === 'string' && CONTACT_ID_PATTERN.test(value);
}

export interface ProvisionResult {
  account: string;
  created: boolean;
  trustlineAdded: boolean;
}

/**
 * Testnet custodial wallets without a key database: each account's seed is
 * HMAC(master, walletKey). The server stores nothing, so redeploys and
 * restarts keep every account; losing the master secret loses them all.
 */
export class CustodialWallets {
  constructor(
    private readonly masterSecret: Buffer,
    private readonly stellar: StellarService,
  ) {}

  /**
   * WALLET_MASTER_SECRET when set; otherwise derived from the demo signer secret
   * so the feature works on an existing deploy without another secret to manage.
   */
  static fromConfig(
    config: { WALLET_MASTER_SECRET?: string; DEMO_SIGNER_SECRET?: string },
    stellar: StellarService,
  ): CustodialWallets | null {
    if (config.WALLET_MASTER_SECRET) {
      return new CustodialWallets(Buffer.from(config.WALLET_MASTER_SECRET, 'utf8'), stellar);
    }
    if (config.DEMO_SIGNER_SECRET?.startsWith('S')) {
      const master = createHmac('sha256', config.DEMO_SIGNER_SECRET)
        .update('trinqa-wallet-master-v1')
        .digest();
      return new CustodialWallets(master, stellar);
    }
    return null;
  }

  newWalletKey(): string {
    return randomBytes(32).toString('base64url');
  }

  signerFor(walletKey: string): AccountSigner {
    if (!isWalletKey(walletKey)) throw new Error('Invalid wallet key');
    return this.derive(`trinqa-wallet-v1:${walletKey}`);
  }

  /**
   * A demo recipient (the seeded contacts the app ships with). Same master, separate
   * namespace, so a contact's account is stable but is never a device's wallet.
   */
  contactSigner(contactId: string): AccountSigner {
    if (!isContactId(contactId)) throw new Error('Invalid contact id');
    return this.derive(`trinqa-contact-v1:${contactId}`);
  }

  private derive(label: string): AccountSigner {
    const seed = createHmac('sha256', this.masterSecret).update(label).digest();
    return new KeypairSigner(Keypair.fromRawEd25519Seed(seed), this.stellar.networkPassphrase);
  }

  /** Idempotent: fund with friendbot if the account is new, then make sure it holds a USDC trustline. */
  async provision(walletKey: string): Promise<ProvisionResult> {
    return this.provisionSigner(this.signerFor(walletKey));
  }

  async provisionContact(contactId: string): Promise<ProvisionResult> {
    return this.provisionSigner(this.contactSigner(contactId));
  }

  private async provisionSigner(signer: AccountSigner): Promise<ProvisionResult> {
    const account = signer.publicKey;

    let created = false;
    if (!(await this.stellar.accountExists(account))) {
      await this.stellar.friendbotFund(account);
      created = true;
    }

    let trustlineAdded = false;
    const balances = await this.stellar.getBalances(account);
    if (!this.stellar.hasUsdcTrustline(balances)) {
      const unsigned = await this.stellar.buildUsdcTrustlineXdr(account);
      const result = await this.stellar.submitSignedXdr(signer.signXdr(unsigned));
      if (!result.successful) throw new Error(`USDC trustline failed: ${result.hash}`);
      trustlineAdded = true;
    }

    return { account, created, trustlineAdded };
  }
}

/** The single env-configured demo account (legacy clients that send no wallet key). */
export function envDemoSigner(secret: string, networkPassphrase: string): AccountSigner {
  return new KeypairSigner(Keypair.fromSecret(secret), networkPassphrase);
}
