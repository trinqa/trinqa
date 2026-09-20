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
const ACCOUNT_KP = Keypair.random();
const ACCOUNT = ACCOUNT_KP.publicKey();
const strategyId = strategyIdForVault(VAULT);

/** Builds a structurally valid unsigned tx envelope (source = ACCOUNT), like DeFindex would return. */
function unsignedDepositXdr(): string {
  return new TransactionBuilder(new Account(ACCOUNT, '1'), {
    fee: '100',
    networkPassphrase: env.STELLAR_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '1' }),
    )
    .setTimeout(60)
    .build()
    .toXDR();
}

function sign(xdr: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, env.STELLAR_PASSPHRASE);
  tx.sign(ACCOUNT_KP);
  return tx.toXDR();
}

function setup() {
  const stellar = new StellarService(env);
  const policy = new PolicyService(env, stellar);
  const defindex = new DefindexYieldAdapter({
    ...env,
    DEFINDEX_API_KEY: 'test-key',
    DEFINDEX_VAULT_ADDRESS: VAULT,
  });
  const builtXdr = unsignedDepositXdr();
  vi.spyOn(defindex, 'depositToVault').mockResolvedValue({ xdr: builtXdr } as never);
  const sendSignedXdr = vi
    .spyOn(defindex, 'sendSignedXdr')
    .mockResolvedValue({ success: true, hash: 'submitted-hash' } as never);
  vi.spyOn(policy.adapter, 'simulateAuthorizeAllocation').mockResolvedValue({ ok: false, reason: 'PolicyNotFound' });
  const ops = new MemoryOperationStore();
  const yieldSvc = new YieldService(defindex, policy, ops, stellar);
  return { stellar, policy, defindex, ops, yieldSvc, sendSignedXdr, builtXdr };
}

describe('YieldService signed transaction guard', () => {
  it('rejects a signed envelope that does not match the built deposit XDR, before submitting', async () => {
    const { yieldSvc, sendSignedXdr } = setup();
    const built = await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });

    const other = sign(unsignedDepositXdr());
    await expect(yieldSvc.executeSignedXdr(built.operationId, other)).rejects.toMatchObject({
      code: 'SIGNED_TX_MISMATCH',
      statusCode: 409,
    });
    expect(sendSignedXdr).not.toHaveBeenCalled();
  });

  it('accepts a signed envelope that matches the built deposit XDR and submits it', async () => {
    const { yieldSvc, sendSignedXdr, builtXdr } = setup();
    const built = await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });
    expect(built.unsignedXdr).toBe(builtXdr);

    const signed = sign(builtXdr);
    const result = await yieldSvc.executeSignedXdr(built.operationId, signed);

    expect(result).toMatchObject({ operationId: built.operationId, successful: true });
    expect(sendSignedXdr).toHaveBeenCalledWith(signed);
  });

  it('rejects re-executing an already-completed operation, before submitting again', async () => {
    const { yieldSvc, sendSignedXdr, builtXdr } = setup();
    const built = await yieldSvc.buildDeposit({ accountId: ACCOUNT, strategyId, amount: '10' });
    const signed = sign(builtXdr);
    await yieldSvc.executeSignedXdr(built.operationId, signed);
    expect(sendSignedXdr).toHaveBeenCalledTimes(1);

    await expect(yieldSvc.executeSignedXdr(built.operationId, signed)).rejects.toMatchObject({
      code: 'ALREADY_COMPLETED',
      statusCode: 409,
    });
    expect(sendSignedXdr).toHaveBeenCalledTimes(1);
  });

  it('DeFindex (Soroban) envelopes keep their hash once signed by the source account', () => {
    const stellar = new StellarService(env);
    const unsigned = unsignedDepositXdr();
    const signed = sign(unsigned);
    expect(stellar.transactionHash(signed)).toBe(stellar.transactionHash(unsigned));
  });
});
