import { describe, expect, it, vi } from 'vitest';
import { Account, Asset, Keypair, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { QuoteStore } from '../../src/services/quote-store.service.js';
import { MemoryOperationStore, recordOperation } from '../../src/services/operation-store.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import { PaymentExecutionService } from '../../src/services/payment-execution.service.js';
import { YieldService } from '../../src/services/yield.service.js';
import { PolicyService } from '../../src/services/policy.service.js';

const payer = Keypair.random();

function unsignedPayment(destination: string, amount: string): string {
  return new TransactionBuilder(new Account(payer.publicKey(), '1'), {
    fee: '100',
    networkPassphrase: env.STELLAR_PASSPHRASE,
  })
    .addOperation(Operation.payment({ destination, asset: Asset.native(), amount }))
    .setTimeout(60)
    .build()
    .toXDR();
}

function sign(xdr: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, env.STELLAR_PASSPHRASE);
  tx.sign(payer);
  return tx.toXDR();
}

async function setup() {
  const stellar = new StellarService(env);
  const defindex = new DefindexYieldAdapter(env);
  const quotes = new QuoteStore();
  const ops = new MemoryOperationStore();
  const execution = new PaymentExecutionService(
    env,
    stellar,
    defindex,
    new SoroswapAdapter(env, stellar.networkPassphrase),
    new TrMockAnchorAdapter(env, stellar.networkPassphrase),
    new AnchorSessionStore(),
    new YieldService(defindex, new PolicyService(env, stellar), ops),
    quotes,
    ops,
  );
  const quote = quotes.save({
    routeType: 'stellar_transfer',
    candidateCount: 1,
    source: { assetCode: 'USDC', amount: '1.0000000' },
    destination: { currency: 'USDC', amount: '1.0000000' },
    fee: { assetCode: 'USDC', amount: '0' },
    estimatedArrivalMinutes: 2,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    providerPayload: {},
  });
  const built = unsignedPayment(Keypair.random().publicKey(), '1');
  const op = await recordOperation(ops, {
    kind: 'payment',
    status: 'awaiting_signature',
    accountId: payer.publicKey(),
    title: 'pay',
    metadata: {
      quoteId: quote.quoteId,
      routeType: 'stellar_transfer',
      currentStep: 'stellar_payment',
      expectedTxHash: stellar.transactionHash(built),
    },
  });
  const submit = vi.spyOn(stellar, 'submitSignedXdr').mockResolvedValue({ successful: true, hash: 'h' });
  return { execution, op, built, submit };
}

describe('signed transaction guard', () => {
  it('rejects a signed tx that differs from the one the BFF built', async () => {
    const { execution, op, submit } = await setup();
    const other = sign(unsignedPayment(Keypair.random().publicKey(), '999'));
    await expect(execution.executeStep(op.id, 'stellar_payment', other)).rejects.toMatchObject({
      code: 'SIGNED_TX_MISMATCH',
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it('submits the signed version of the built tx', async () => {
    const { execution, op, built, submit } = await setup();
    await expect(execution.executeStep(op.id, 'stellar_payment', sign(built))).resolves.toMatchObject({
      stepCompleted: 'stellar_payment',
    });
    expect(submit).toHaveBeenCalledOnce();
  });
});
