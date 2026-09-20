import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { Keypair } from '@stellar/stellar-sdk';
import {
  IncomingPaymentWatcher,
  type HorizonPaymentRecord,
  type HorizonPaymentSource,
} from '../../src/services/incoming-payment-watcher.service.js';
import { MemoryHorizonCursorStore } from '../../src/services/horizon-cursor-store.js';
import { MemoryPushTokenRegistry } from '../../src/services/push-tokens.service.js';
import type { PushNotification, PushSender } from '../../src/services/push-sender.service.js';
import { MemoryOperationStore } from '../../src/services/operation-store.js';
import { registerAnchorRoutes } from '../../src/routes/v1/anchor.js';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';
import type { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { YieldService } from '../../src/services/yield.service.js';
import type { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import type { PolicyService } from '../../src/services/policy.service.js';
import { PaymentExecutionService } from '../../src/services/payment-execution.service.js';
import type { AppConfig } from '../../src/config/env.js';
import type { StellarService } from '../../src/services/stellar.service.js';
import type { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { QuoteStore } from '../../src/services/quote-store.service.js';

const ACCOUNT = Keypair.random().publicKey();
const SENDER_ACCOUNT = Keypair.random().publicKey();
const USDC = { code: 'USDC', issuer: Keypair.random().publicKey() };

function pushToken(suffix: string): string {
  return `ExponentPushToken[${suffix}]`;
}

/** A sender that records calls; the real one never throws either. */
function fakeSender(): PushSender & { notify: ReturnType<typeof vi.fn> } {
  return {
    notify: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  };
}

function usdcPayment(overrides: Partial<HorizonPaymentRecord> = {}): HorizonPaymentRecord {
  return {
    type: 'payment',
    paging_token: '100',
    asset_code: USDC.code,
    asset_issuer: USDC.issuer,
    from: SENDER_ACCOUNT,
    to: ACCOUNT,
    amount: '12.5',
    transaction_hash: 'abc',
    ...overrides,
  };
}

describe('IncomingPaymentWatcher', () => {
  async function registryWithDevice() {
    const registry = new MemoryPushTokenRegistry();
    await registry.register({ accountId: ACCOUNT, expoPushToken: pushToken('d1'), platform: 'ios' });
    return registry;
  }

  function watcherWith(
    registry: MemoryPushTokenRegistry,
    sender: PushSender,
    source: HorizonPaymentSource,
    cursors = new MemoryHorizonCursorStore(),
  ) {
    const logger = { warn: vi.fn() };
    const watcher = new IncomingPaymentWatcher(registry, sender, source, cursors, USDC, { logger });
    return { watcher, cursors, logger };
  }

  it('starts a never-seen account at the present instead of replaying its history', async () => {
    const registry = await registryWithDevice();
    const sender = fakeSender();
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => usdcPayment({ paging_token: '900' })),
      paymentsAfter: vi.fn(async () => []),
    };
    const { watcher, cursors } = watcherWith(registry, sender, source);

    await watcher.tick();

    expect(sender.notify).not.toHaveBeenCalled();
    expect(source.paymentsAfter).not.toHaveBeenCalled();
    expect(await cursors.get(ACCOUNT)).toBe('900');
  });

  it('notifies on an incoming USDC payment, advances the cursor and does not repeat itself', async () => {
    const registry = await registryWithDevice();
    const sender = fakeSender();
    const pages: HorizonPaymentRecord[][] = [[usdcPayment({ paging_token: '101', amount: '12.5' })], []];
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => null),
      paymentsAfter: vi.fn(async () => pages.shift() ?? []),
    };
    const cursors = new MemoryHorizonCursorStore();
    await cursors.set(ACCOUNT, '100');
    const { watcher } = watcherWith(registry, sender, source, cursors);

    await watcher.tick();

    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [account, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(account).toBe(ACCOUNT);
    expect(notification.title).toBe('Money arrived');
    expect(notification.body).toBe('12.5 USDC is now in your Trinqa account.');
    expect(notification.data).toMatchObject({ route: '/activity', txHash: 'abc' });
    expect(await cursors.get(ACCOUNT)).toBe('101');

    await watcher.tick();

    expect(sender.notify).toHaveBeenCalledTimes(1);
    expect(source.paymentsAfter).toHaveBeenNthCalledWith(2, ACCOUNT, '101', expect.any(Number));
  });

  it('ignores a self-payment and a non-USDC asset, but still advances past them', async () => {
    const registry = await registryWithDevice();
    const sender = fakeSender();
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => null),
      paymentsAfter: vi.fn(async () => [
        usdcPayment({ paging_token: '101', from: ACCOUNT }),
        usdcPayment({ paging_token: '102', asset_code: 'XLM', asset_issuer: undefined }),
        usdcPayment({ paging_token: '103', asset_issuer: Keypair.random().publicKey() }),
        usdcPayment({ paging_token: '104', to: SENDER_ACCOUNT }),
      ]),
    };
    const cursors = new MemoryHorizonCursorStore();
    await cursors.set(ACCOUNT, '100');
    const { watcher } = watcherWith(registry, sender, source, cursors);

    await watcher.tick();

    expect(sender.notify).not.toHaveBeenCalled();
    expect(await cursors.get(ACCOUNT)).toBe('104');
  });

  it('survives a Horizon failure without advancing the cursor', async () => {
    const registry = await registryWithDevice();
    const sender = fakeSender();
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => null),
      paymentsAfter: vi.fn(async () => {
        throw new Error('horizon down');
      }),
    };
    const cursors = new MemoryHorizonCursorStore();
    await cursors.set(ACCOUNT, '100');
    const { watcher, logger } = watcherWith(registry, sender, source, cursors);

    await expect(watcher.tick()).resolves.toBeUndefined();

    expect(await cursors.get(ACCOUNT)).toBe('100');
    expect(sender.notify).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('polls only accounts that have a registered device', async () => {
    const registry = new MemoryPushTokenRegistry();
    const sender = fakeSender();
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => null),
      paymentsAfter: vi.fn(async () => []),
    };
    const { watcher } = watcherWith(registry, sender, source);

    await watcher.tick();

    expect(source.latestPayment).not.toHaveBeenCalled();
  });

  it('starts and stops without leaving a timer behind', () => {
    const registry = new MemoryPushTokenRegistry();
    const source: HorizonPaymentSource = {
      latestPayment: vi.fn(async () => null),
      paymentsAfter: vi.fn(async () => []),
    };
    const { watcher } = watcherWith(registry, fakeSender(), source);

    expect(watcher.isRunning).toBe(false);
    watcher.start();
    expect(watcher.isRunning).toBe(true);
    watcher.start();
    watcher.stop();
    expect(watcher.isRunning).toBe(false);
  });
});

describe('anchor transfer-status hook', () => {
  const sessions = new AnchorSessionStore();
  let anchorStatus = 'completed';

  const anchor = {
    sep6Transaction: async () => ({ transaction: { status: anchorStatus } }),
  } as unknown as TrMockAnchorAdapter;

  async function pollTwice(kind: 'anchor_deposit' | 'anchor_withdraw', status: string) {
    anchorStatus = status;
    const operations = new MemoryOperationStore();
    const sender = fakeSender();
    const op = await operations.create({
      kind,
      status: 'processing',
      accountId: ACCOUNT,
      title: kind === 'anchor_deposit' ? 'Anchor deposit' : 'Anchor withdrawal',
      amount: { assetCode: kind === 'anchor_deposit' ? 'TRY' : 'USDC', amount: '100' },
      externalRefs: { anchorTransferId: 'tr-1' },
    });

    const app = Fastify();
    registerAnchorRoutes(app, anchor, sessions, operations, sender);
    const sessionId = sessions.create('jwt', ACCOUNT).sessionId;
    const url = `/api/v1/anchor/transfers/tr-1?sessionId=${sessionId}&operationId=${op.id}`;

    const first = await app.inject({ method: 'GET', url });
    const second = await app.inject({ method: 'GET', url });
    await app.close();

    return { sender, first, second, operations, opId: op.id };
  }

  it('announces a credited deposit once, and not on the next poll', async () => {
    const { sender, first, second, operations, opId } = await pollTwice('anchor_deposit', 'completed');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [account, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(account).toBe(ACCOUNT);
    expect(notification.title).toBe('Money added');
    expect(notification.body).toBe('Your 100 TRY deposit is done. The money is in your Trinqa account.');
    expect(notification.data).toMatchObject({ route: '/activity', operationId: opId });
    expect((await operations.get(opId))?.status).toBe('completed');
  });

  it('announces a paid-out withdrawal once', async () => {
    const { sender } = await pollTwice('anchor_withdraw', 'completed');

    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(notification.title).toBe('Money sent');
    expect(notification.body).toBe('Your 100 USDC withdrawal has been paid out.');
    expect(notification.data).toMatchObject({ route: '/activity' });
  });

  it('announces a failed transfer once', async () => {
    const { sender } = await pollTwice('anchor_deposit', 'error');

    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(notification.title).toBe('Deposit didn’t go through');
    expect(notification.body).toBe('We couldn’t finish it. Open Trinqa to see what happened.');
    expect(notification.data).toMatchObject({ route: '/activity' });
  });

  it('says nothing while the transfer is still in flight', async () => {
    const { sender } = await pollTwice('anchor_deposit', 'pending_user_transfer_start');

    expect(sender.notify).not.toHaveBeenCalled();
  });
});

describe('yield deposit hook', () => {
  const defindex = {
    isConfigured: true,
    sendSignedXdr: async () => ({ hash: 'tx-yield', success: true }),
  } as unknown as DefindexYieldAdapter;
  const policy = {} as unknown as PolicyService;

  it('announces a deposit that executed, once', async () => {
    const operations = new MemoryOperationStore();
    const sender = fakeSender();
    const svc = new YieldService(defindex, policy, operations, undefined, sender);
    const op = await operations.create({
      kind: 'yield_deposit',
      status: 'awaiting_signature',
      accountId: ACCOUNT,
      title: 'Yield deposit',
      amount: { assetCode: 'USDC', amount: '40' },
    });

    await svc.executeSignedXdr(op.id, 'signed-xdr-value');

    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [account, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(account).toBe(ACCOUNT);
    expect(notification.title).toBe('Your money started earning');
    expect(notification.body).toBe('40 USDC is now set aside to grow.');
    expect(notification.data).toMatchObject({ route: '/earn', operationId: op.id });

    // A replay is rejected as already completed, so no second notification.
    await expect(svc.executeSignedXdr(op.id, 'signed-xdr-value')).rejects.toMatchObject({
      code: 'ALREADY_COMPLETED',
    });
    expect(sender.notify).toHaveBeenCalledTimes(1);
  });

  it('says nothing for a yield withdrawal', async () => {
    const operations = new MemoryOperationStore();
    const sender = fakeSender();
    const svc = new YieldService(defindex, policy, operations, undefined, sender);
    const op = await operations.create({
      kind: 'yield_withdraw',
      status: 'awaiting_signature',
      accountId: ACCOUNT,
      title: 'Yield withdraw',
    });

    await svc.executeSignedXdr(op.id, 'signed-xdr-value');

    expect(sender.notify).not.toHaveBeenCalled();
  });
});

describe('payment completion hook', () => {
  const config = { TR_ANCHOR_DOMAIN: 'anchor.test' } as unknown as AppConfig;
  let submitted: { hash: string; successful: boolean };

  const stellar = {
    networkPassphrase: 'Test SDF Network ; September 2015',
    submitSignedXdr: async () => submitted,
  } as unknown as StellarService;

  function service(operations: MemoryOperationStore, sender: PushSender) {
    return new PaymentExecutionService(
      config,
      stellar,
      {} as unknown as DefindexYieldAdapter,
      {} as unknown as SoroswapAdapter,
      {} as unknown as TrMockAnchorAdapter,
      new AnchorSessionStore(),
      {} as unknown as YieldService,
      new QuoteStore(),
      operations,
      sender,
    );
  }

  async function payment(operations: MemoryOperationStore) {
    return operations.create({
      kind: 'payment',
      status: 'awaiting_signature',
      accountId: ACCOUNT,
      title: 'Pay 250 TRY',
      amount: { assetCode: 'USDC', amount: '7.25' },
      metadata: { currentStep: 'stellar_payment', completedSteps: [] },
    });
  }

  beforeEach(() => {
    submitted = { hash: 'tx-pay', successful: true };
  });

  it('announces a finished payment once, and refuses to replay the step', async () => {
    const operations = new MemoryOperationStore();
    const sender = fakeSender();
    const execution = service(operations, sender);
    const op = await payment(operations);

    await execution.executeStep(op.id, 'stellar_payment', 'signed-xdr-value');

    expect(sender.notify).toHaveBeenCalledTimes(1);
    const [account, notification] = sender.notify.mock.calls[0] as [string, PushNotification];
    expect(account).toBe(ACCOUNT);
    expect(notification.title).toBe('Payment sent');
    expect(notification.body).toBe('Your 7.25 USDC payment went through.');
    expect(notification.data).toMatchObject({ route: '/activity', operationId: op.id });

    await expect(
      execution.executeStep(op.id, 'stellar_payment', 'signed-xdr-value'),
    ).rejects.toMatchObject({ code: 'ALREADY_COMPLETED' });
    expect(sender.notify).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the submission did not succeed', async () => {
    const operations = new MemoryOperationStore();
    const sender = fakeSender();
    const execution = service(operations, sender);
    const op = await payment(operations);
    submitted = { hash: 'tx-pay', successful: false };

    await execution.executeStep(op.id, 'stellar_payment', 'signed-xdr-value');

    expect(sender.notify).not.toHaveBeenCalled();
    expect((await operations.get(op.id))?.status).toBe('failed');
  });
});
