import { describe, expect, it, vi } from 'vitest';
import { Account, Asset, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { PolicyService } from '../../src/services/policy.service.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { MemoryOperationStore } from '../../src/services/operation-store.js';
import { YieldService } from '../../src/services/yield.service.js';
import { strategyIdForVault } from '../../src/domain/yield.js';

const VAULT = 'CVAULT1234567890123456789012345678901234567890123456789012';
const ACCOUNT = 'G'.repeat(56);

/** A structurally valid unsigned tx XDR, standing in for a real DeFindex deposit envelope. */
function fakeUnsignedXdr(): string {
  return new TransactionBuilder(new Account(Keypair.random().publicKey(), '1'), {
    fee: '100',
    networkPassphrase: env.STELLAR_PASSPHRASE,
  })
    .addOperation(Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' }))
    .setTimeout(60)
    .build()
    .toXDR();
}

function setup() {
  const stellar = new StellarService(env);
  const policy = new PolicyService(env, stellar);
  const defindex = new DefindexYieldAdapter({
    ...env,
    DEFINDEX_API_KEY: 'test-key',
    DEFINDEX_VAULT_ADDRESS: VAULT,
  });
  vi.spyOn(defindex, 'depositToVault').mockResolvedValue({ xdr: fakeUnsignedXdr() } as never);
  const ops = new MemoryOperationStore();
  const yieldSvc = new YieldService(defindex, policy, ops, stellar);
  const simulate = vi.spyOn(policy.adapter, 'simulateAuthorizeAllocation');
  const getBalances = vi.spyOn(stellar, 'getBalances');
  return { stellar, policy, defindex, ops, yieldSvc, simulate, getBalances };
}

const strategyId = strategyIdForVault(VAULT);

describe('YieldService deposit policy gate', () => {
  it('allows and records policyCheck=authorized when the contract authorizes the allocation', async () => {
    const { yieldSvc, simulate, getBalances, ops } = setup();
    getBalances.mockResolvedValue([
      { assetType: 'credit_alphanum4', assetCode: 'USDC', assetIssuer: env.USDC_ISSUER, balance: '100.0000000' },
    ]);
    simulate.mockResolvedValue({ ok: true });

    const result = await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });

    expect(result.policyCheck).toBe('authorized');
    expect(simulate).toHaveBeenCalledWith(ACCOUNT, strategyId, 1000); // 10 / 100 * 10000 bps
    const stored = await ops.get(result.operationId);
    expect(stored?.metadata).toMatchObject({ policyCheck: 'authorized', policyAmountBps: 1000 });
  });

  it('allows and records policyCheck=no_policy when the user has no policy stored', async () => {
    const { yieldSvc, simulate, getBalances, ops } = setup();
    getBalances.mockResolvedValue([]);
    simulate.mockResolvedValue({ ok: false, reason: 'PolicyNotFound' });

    const result = await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });

    expect(result.policyCheck).toBe('no_policy');
    const stored = await ops.get(result.operationId!);
    expect(stored?.metadata).toMatchObject({ policyCheck: 'no_policy' });
    expect(stored?.metadata).not.toHaveProperty('policyAmountBps');
  });

  it('rejects with 403 POLICY_DENIED when automation is paused', async () => {
    const { yieldSvc, simulate, getBalances, defindex } = setup();
    getBalances.mockResolvedValue([]);
    simulate.mockResolvedValue({ ok: false, reason: 'AutomationPaused' });
    const deposit = vi.spyOn(defindex, 'depositToVault');

    await expect(
      yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' }),
    ).rejects.toMatchObject({
      code: 'POLICY_DENIED',
      statusCode: 403,
      details: { reason: 'AutomationPaused', strategy: strategyId },
    });
    // The policy gate runs before we ever build/submit the DeFindex deposit.
    expect(deposit).not.toHaveBeenCalled();
  });

  it('rejects with 403 POLICY_DENIED when the strategy is not on the allowlist', async () => {
    const { yieldSvc, simulate, getBalances } = setup();
    getBalances.mockResolvedValue([]);
    simulate.mockResolvedValue({ ok: false, reason: 'StrategyNotAllowed' });

    await expect(
      yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' }),
    ).rejects.toMatchObject({
      code: 'POLICY_DENIED',
      statusCode: 403,
      details: { reason: 'StrategyNotAllowed' },
    });
  });

  it('rejects with 503 ADAPTER_UNAVAILABLE when the policy simulation infra fails, never silently allowing', async () => {
    const { yieldSvc, simulate, getBalances, defindex } = setup();
    getBalances.mockResolvedValue([]);
    simulate.mockRejectedValue(new Error('soroban RPC: ECONNREFUSED'));
    const deposit = vi.spyOn(defindex, 'depositToVault');

    await expect(
      yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' }),
    ).rejects.toMatchObject({
      code: 'ADAPTER_UNAVAILABLE',
      statusCode: 503,
    });
    expect(deposit).not.toHaveBeenCalled();
  });

  describe('amount_bps computation', () => {
    it('is the deposit as a share of the available USDC balance, rounded up', async () => {
      const { yieldSvc, simulate, getBalances } = setup();
      getBalances.mockResolvedValue([
        { assetType: 'credit_alphanum4', assetCode: 'USDC', assetIssuer: env.USDC_ISSUER, balance: '33.0000000' },
      ]);
      simulate.mockResolvedValue({ ok: true });

      await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '1' });

      // 1/33 * 10000 = 303.03... -> rounds up to 304
      expect(simulate).toHaveBeenCalledWith(ACCOUNT, strategyId, 304);
    });

    it('clamps to 10000 when the deposit exceeds the available balance', async () => {
      const { yieldSvc, simulate, getBalances } = setup();
      getBalances.mockResolvedValue([
        { assetType: 'credit_alphanum4', assetCode: 'USDC', assetIssuer: env.USDC_ISSUER, balance: '5.0000000' },
      ]);
      simulate.mockResolvedValue({ ok: true });

      await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '50' });

      expect(simulate).toHaveBeenCalledWith(ACCOUNT, strategyId, 10_000);
    });

    it('falls back to 10000 when the balance cannot be read (no USDC line)', async () => {
      const { yieldSvc, simulate, getBalances } = setup();
      getBalances.mockResolvedValue([]);
      simulate.mockResolvedValue({ ok: true });

      await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });

      expect(simulate).toHaveBeenCalledWith(ACCOUNT, strategyId, 10_000);
    });

    it('falls back to 10000 when reading the balance throws', async () => {
      const { yieldSvc, simulate, getBalances } = setup();
      getBalances.mockRejectedValue(new Error('horizon down'));
      simulate.mockResolvedValue({ ok: true });

      await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });

      expect(simulate).toHaveBeenCalledWith(ACCOUNT, strategyId, 10_000);
    });
  });
});
