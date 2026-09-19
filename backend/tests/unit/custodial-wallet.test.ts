import { describe, expect, it, vi } from 'vitest';

// Gated demo routes need the signer switched on; wallet-key requests never touch this env key.
vi.hoisted(() => {
  process.env.DEMO_SIGNER_ENABLED = 'true';
  process.env.DEMO_SIGNER_SECRET = `S${'A'.repeat(55)}`;
  process.env.DEMO_ACCESS_TOKEN = '';
});
import Fastify from 'fastify';
import { Account, Keypair, Networks, Operation, TransactionBuilder, Transaction } from '@stellar/stellar-sdk';
import { CustodialWallets, isWalletKey } from '../../src/services/custodial-wallet.service.js';
import { registerDemoRoutes } from '../../src/routes/v1/demo.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import type { StellarService } from '../../src/services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';

const DEMO_SECRET = Keypair.random().secret();

function fakeStellar(overrides: Partial<Record<keyof StellarService, unknown>> = {}) {
  return {
    networkPassphrase: Networks.TESTNET,
    accountExists: vi.fn().mockResolvedValue(true),
    friendbotFund: vi.fn().mockResolvedValue({ funded: true }),
    getBalances: vi.fn().mockResolvedValue([{ assetType: 'native', balance: '10000' }]),
    hasUsdcTrustline: vi.fn().mockReturnValue(false),
    buildUsdcTrustlineXdr: vi.fn(async (account: string) => unsignedFrom(account)),
    submitSignedXdr: vi.fn().mockResolvedValue({ hash: 'abc', successful: true }),
    ...overrides,
  } as unknown as StellarService;
}

function unsignedFrom(source: string): string {
  return new TransactionBuilder(new Account(source, '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.bumpSequence({ bumpTo: '2' }))
    .setTimeout(30)
    .build()
    .toXDR();
}

describe('CustodialWallets', () => {
  const stellar = fakeStellar();
  const wallets = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, stellar)!;

  it('derives the same account for the same wallet key and different ones across keys', () => {
    const key = wallets.newWalletKey();
    expect(isWalletKey(key)).toBe(true);
    expect(wallets.signerFor(key).publicKey).toBe(wallets.signerFor(key).publicKey);
    expect(wallets.signerFor(key).publicKey).not.toBe(wallets.signerFor(wallets.newWalletKey()).publicKey);
  });

  it('keeps accounts stable across instances with the same master', () => {
    const key = wallets.newWalletKey();
    const again = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, stellar)!;
    const other = CustodialWallets.fromConfig({ WALLET_MASTER_SECRET: 'another-master' }, stellar)!;
    expect(again.signerFor(key).publicKey).toBe(wallets.signerFor(key).publicKey);
    expect(other.signerFor(key).publicKey).not.toBe(wallets.signerFor(key).publicKey);
  });

  it('is not configured without any secret', () => {
    expect(CustodialWallets.fromConfig({}, stellar)).toBeNull();
  });

  it('rejects malformed wallet keys', () => {
    expect(() => wallets.signerFor('short')).toThrow();
  });

  it('funds a new account and adds the USDC trustline, signed by that account', async () => {
    const s = fakeStellar({ accountExists: vi.fn().mockResolvedValue(false) });
    const w = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, s)!;
    const key = w.newWalletKey();
    const result = await w.provision(key);

    expect(result).toEqual({ account: w.signerFor(key).publicKey, created: true, trustlineAdded: true });
    expect(s.friendbotFund).toHaveBeenCalledWith(result.account);
    const signed = vi.mocked(s.submitSignedXdr).mock.calls[0][0];
    const tx = TransactionBuilder.fromXDR(signed, Networks.TESTNET) as Transaction;
    expect(tx.signatures).toHaveLength(1);
    expect(Keypair.fromPublicKey(result.account).verify(tx.hash(), tx.signatures[0].signature())).toBe(true);
  });

  it('is idempotent for an account that is already set up', async () => {
    const s = fakeStellar({ hasUsdcTrustline: vi.fn().mockReturnValue(true) });
    const w = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, s)!;
    const result = await w.provision(w.newWalletKey());
    expect(result).toMatchObject({ created: false, trustlineAdded: false });
    expect(s.friendbotFund).not.toHaveBeenCalled();
    expect(s.submitSignedXdr).not.toHaveBeenCalled();
  });
});

describe('demo routes with a wallet key', () => {
  async function appWith(stellar: StellarService) {
    const app = Fastify();
    const anchor = {} as TrMockAnchorAdapter;
    const wallets = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, stellar)!;
    registerDemoRoutes(app, stellar, anchor, new AnchorSessionStore(), wallets);
    return { app, wallets };
  }

  it('provisions a wallet and signs only for that wallet', async () => {
    const stellar = fakeStellar();
    const { app, wallets } = await appWith(stellar);
    const headers = {};

    const created = await app.inject({ method: 'POST', url: '/api/v1/demo/wallets', headers, payload: {} });
    expect(created.statusCode).toBe(200);
    const { walletKey, account } = created.json();
    expect(account).toBe(wallets.signerFor(walletKey).publicKey);

    const walletHeaders = { ...headers, 'x-wallet-key': walletKey };
    const me = await app.inject({ method: 'GET', url: '/api/v1/demo/account', headers: walletHeaders });
    expect(me.json().account).toBe(account);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/sign',
      headers: walletHeaders,
      payload: { unsignedXdr: unsignedFrom(account) },
    });
    expect(ok.statusCode).toBe(200);

    const foreign = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/sign',
      headers: walletHeaders,
      payload: { unsignedXdr: unsignedFrom(Keypair.random().publicKey()) },
    });
    expect(foreign.statusCode).toBe(400);
    expect(foreign.json()).toMatchObject({ error: 'account_mismatch' });

    const bad = await app.inject({
      method: 'GET',
      url: '/api/v1/demo/account',
      headers: { ...headers, 'x-wallet-key': 'nope' },
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });
});
