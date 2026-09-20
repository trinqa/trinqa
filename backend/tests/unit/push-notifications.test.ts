import { afterAll, describe, expect, it, vi } from 'vitest';

// The device routes sit behind the demo signer guard, exactly like the other device-scoped routes.
vi.hoisted(() => {
  process.env.DEMO_SIGNER_ENABLED = 'true';
  process.env.DEMO_SIGNER_SECRET = `S${'A'.repeat(55)}`;
  process.env.DEMO_ACCESS_TOKEN = '';
});
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import {
  JsonFilePushTokenRegistry,
  MemoryPushTokenRegistry,
  isExpoPushToken,
  maskPushToken,
  type PushTokenRegistry,
} from '../../src/services/push-tokens.service.js';
import { ExpoPushSender, type PushLogger } from '../../src/services/push-sender.service.js';
import { registerNotificationRoutes } from '../../src/routes/v1/notifications.js';
import { CustodialWallets } from '../../src/services/custodial-wallet.service.js';
import type { StellarService } from '../../src/services/stellar.service.js';

const DEMO_SECRET = Keypair.random().secret();
const ACCOUNT_A = Keypair.random().publicKey();
const ACCOUNT_B = Keypair.random().publicKey();

function token(suffix: string): string {
  return `ExponentPushToken[${suffix}]`;
}

const tmpDirs: string[] = [];

function tmpRegistry(): JsonFilePushTokenRegistry {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trinqa-push-'));
  tmpDirs.push(dir);
  return new JsonFilePushTokenRegistry(path.join(dir, 'push-tokens.json'));
}

afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function silentLogger(): PushLogger & { warn: ReturnType<typeof vi.fn> } {
  return { warn: vi.fn() };
}

describe('push token shape', () => {
  it('accepts both Expo spellings and rejects anything else', () => {
    expect(isExpoPushToken(token('abc123'))).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc123]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken('abc123')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[a b]')).toBe(false);
    expect(isExpoPushToken(42)).toBe(false);
  });

  it('never exposes a token in full when masked', () => {
    const masked = maskPushToken(token('secret-device-1234'));
    expect(masked).not.toContain('secret-device');
    expect(masked.endsWith('1234]')).toBe(true);
  });
});

describe.each<[string, () => PushTokenRegistry]>([
  ['memory', () => new MemoryPushTokenRegistry()],
  ['json file', () => tmpRegistry()],
])('push token registry (%s)', (_name, make) => {
  it('registers idempotently and keeps several devices per account', async () => {
    const registry = make();
    await registry.register({ accountId: ACCOUNT_A, expoPushToken: token('a1'), platform: 'ios' });
    await registry.register({ accountId: ACCOUNT_A, expoPushToken: token('a1'), platform: 'ios' });
    await registry.register({ accountId: ACCOUNT_A, expoPushToken: token('a2'), platform: 'android' });

    const devices = await registry.listByAccount(ACCOUNT_A);
    expect(devices.map((d) => d.expoPushToken).sort()).toEqual([token('a1'), token('a2')]);
    expect(devices.find((d) => d.expoPushToken === token('a2'))?.platform).toBe('android');
    expect(devices.every((d) => typeof d.updatedAt === 'string' && d.updatedAt.length > 0)).toBe(true);
  });

  it('moves a token to the new account instead of duplicating it', async () => {
    const registry = make();
    await registry.register({ accountId: ACCOUNT_A, expoPushToken: token('shared'), platform: 'ios' });
    await registry.register({ accountId: ACCOUNT_B, expoPushToken: token('shared'), platform: 'ios' });

    expect(await registry.listByAccount(ACCOUNT_A)).toEqual([]);
    expect((await registry.listByAccount(ACCOUNT_B)).map((d) => d.expoPushToken)).toEqual([token('shared')]);
  });

  it('removes a token and reports whether it was there', async () => {
    const registry = make();
    await registry.register({ accountId: ACCOUNT_A, expoPushToken: token('gone'), platform: 'ios' });

    expect(await registry.remove(token('gone'))).toBe(true);
    expect(await registry.remove(token('gone'))).toBe(false);
    expect(await registry.listByAccount(ACCOUNT_A)).toEqual([]);
  });

  it('rejects a malformed token or platform', async () => {
    const registry = make();
    await expect(
      registry.register({ accountId: ACCOUNT_A, expoPushToken: 'not-a-token', platform: 'ios' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      registry.register({
        accountId: ACCOUNT_A,
        expoPushToken: token('ok'),
        platform: 'web' as unknown as 'ios',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await registry.listByAccount(ACCOUNT_A)).toEqual([]);
  });
});

describe('JsonFilePushTokenRegistry persistence', () => {
  it('reloads what an earlier instance wrote', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trinqa-push-'));
    tmpDirs.push(dir);
    const file = path.join(dir, 'push-tokens.json');

    await new JsonFilePushTokenRegistry(file).register({
      accountId: ACCOUNT_A,
      expoPushToken: token('persisted'),
      platform: 'android',
    });

    const reopened = await new JsonFilePushTokenRegistry(file).listByAccount(ACCOUNT_A);
    expect(reopened).toHaveLength(1);
    expect(reopened[0]?.expoPushToken).toBe(token('persisted'));
  });
});

function okResponse(statuses: Array<{ status: 'ok' } | { status: 'error'; details?: { error: string } }>) {
  return new Response(JSON.stringify({ data: statuses }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ExpoPushSender', () => {
  async function registryWith(count: number): Promise<PushTokenRegistry> {
    const registry = new MemoryPushTokenRegistry();
    for (let i = 0; i < count; i += 1) {
      await registry.register({ accountId: ACCOUNT_A, expoPushToken: token(`d${i}`), platform: 'ios' });
    }
    return registry;
  }

  it('sends one message per device with Expo\'s message shape', async () => {
    const registry = await registryWith(2);
    const fetchFn = vi.fn(async () => okResponse([{ status: 'ok' }, { status: 'ok' }]));
    const sender = new ExpoPushSender(registry, { fetch: fetchFn as unknown as typeof fetch });

    const result = await sender.notify(ACCOUNT_A, { title: 'Paid', body: '5 USDC', data: { id: 'op-1' } });

    expect(result).toEqual({ sent: 2, failed: 0, pruned: 0 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const messages = JSON.parse(String(init.body)) as unknown[];
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ title: 'Paid', body: '5 USDC', data: { id: 'op-1' }, sound: 'default' });
    expect(init.signal).toBeDefined();
  });

  it('does nothing and makes no request for an account with no devices', async () => {
    const fetchFn = vi.fn();
    const sender = new ExpoPushSender(new MemoryPushTokenRegistry(), {
      fetch: fetchFn as unknown as typeof fetch,
    });

    expect(await sender.notify(ACCOUNT_A, { title: 't', body: 'b' })).toEqual({
      sent: 0,
      failed: 0,
      pruned: 0,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('batches at 100 messages per request', async () => {
    const registry = await registryWith(101);
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const messages = JSON.parse(String(init.body)) as unknown[];
      return okResponse(messages.map(() => ({ status: 'ok' as const })));
    });
    const sender = new ExpoPushSender(registry, { fetch: fetchFn as unknown as typeof fetch });

    const result = await sender.notify(ACCOUNT_A, { title: 't', body: 'b' });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const sizes = fetchFn.mock.calls.map(
      ([, init]) => (JSON.parse(String((init as RequestInit).body)) as unknown[]).length,
    );
    expect(sizes).toEqual([100, 1]);
    expect(result.sent).toBe(101);
  });

  it('swallows a transport failure so a payment never fails on a notification', async () => {
    const registry = await registryWith(1);
    const logger = silentLogger();
    const sender = new ExpoPushSender(registry, {
      fetch: vi.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
      logger,
    });

    await expect(sender.notify(ACCOUNT_A, { title: 't', body: 'b' })).resolves.toEqual({
      sent: 0,
      failed: 1,
      pruned: 0,
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(await registry.listByAccount(ACCOUNT_A)).toHaveLength(1);
  });

  it('swallows a non-200 response and an unparseable body', async () => {
    const registry = await registryWith(1);
    const logger = silentLogger();
    const responses = [
      new Response('nope', { status: 503 }),
      new Response('{"unexpected":true}', { status: 200, headers: { 'content-type': 'application/json' } }),
    ];
    const sender = new ExpoPushSender(registry, {
      fetch: vi.fn(async () => responses.shift()!) as unknown as typeof fetch,
      logger,
    });

    await expect(sender.notify(ACCOUNT_A, { title: 't', body: 'b' })).resolves.toMatchObject({ failed: 1 });
    await expect(sender.notify(ACCOUNT_A, { title: 't', body: 'b' })).resolves.toMatchObject({ failed: 1 });
    expect(await registry.listByAccount(ACCOUNT_A)).toHaveLength(1);
  });

  it('prunes only the tokens Expo reports as DeviceNotRegistered', async () => {
    const registry = await registryWith(3);
    const logger = silentLogger();
    const sender = new ExpoPushSender(registry, {
      fetch: vi.fn(async () =>
        okResponse([
          { status: 'ok' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
          { status: 'error', details: { error: 'MessageTooBig' } },
        ]),
      ) as unknown as typeof fetch,
      logger,
    });

    const result = await sender.notify(ACCOUNT_A, { title: 't', body: 'b' });

    expect(result).toEqual({ sent: 1, failed: 2, pruned: 1 });
    expect((await registry.listByAccount(ACCOUNT_A)).map((d) => d.expoPushToken).sort()).toEqual([
      token('d0'),
      token('d2'),
    ]);
    // The pruning log carries masked tokens only.
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(token('d1'));
  });
});

describe('notification device routes', () => {
  const stellar = { networkPassphrase: Networks.TESTNET } as unknown as StellarService;
  const wallets = CustodialWallets.fromConfig({ DEMO_SIGNER_SECRET: DEMO_SECRET }, stellar)!;

  async function appWith(registry: PushTokenRegistry) {
    const app = Fastify();
    registerNotificationRoutes(app, registry, wallets);
    return app;
  }

  it('registers a device against the wallet key\'s account and unregisters it again', async () => {
    const registry = new MemoryPushTokenRegistry();
    const app = await appWith(registry);
    const walletKey = wallets.newWalletKey();
    const account = wallets.signerFor(walletKey).publicKey;
    const headers = { 'x-wallet-key': walletKey };

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/devices',
      headers,
      payload: { expoPushToken: token('device-1'), platform: 'ios' },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toEqual({ account, platform: 'ios', devices: 1 });
    expect((await registry.listByAccount(account)).map((d) => d.expoPushToken)).toEqual([token('device-1')]);

    const removed = await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/devices',
      headers,
      payload: { expoPushToken: token('device-1') },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ account, removed: true, devices: 0 });

    await app.close();
  });

  it('rejects a request without a wallet key, and one with a malformed key', async () => {
    const registry = new MemoryPushTokenRegistry();
    const app = await appWith(registry);
    const payload = { expoPushToken: token('device-1'), platform: 'ios' };

    const anonymous = await app.inject({ method: 'POST', url: '/api/v1/notifications/devices', payload });
    expect(anonymous.statusCode).toBe(400);
    expect(anonymous.json()).toMatchObject({ error: 'VALIDATION_ERROR' });

    const malformed = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/devices',
      headers: { 'x-wallet-key': 'nope' },
      payload,
    });
    expect(malformed.statusCode).toBe(400);

    const badToken = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/devices',
      headers: { 'x-wallet-key': wallets.newWalletKey() },
      payload: { expoPushToken: 'not-a-token', platform: 'ios' },
    });
    expect(badToken.statusCode).toBe(400);

    await app.close();
  });

  it('will not let one account unregister another account\'s token', async () => {
    const registry = new MemoryPushTokenRegistry();
    const app = await appWith(registry);
    const ownerKey = wallets.newWalletKey();
    const owner = wallets.signerFor(ownerKey).publicKey;
    await registry.register({ accountId: owner, expoPushToken: token('owned'), platform: 'ios' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/notifications/devices',
      headers: { 'x-wallet-key': wallets.newWalletKey() },
      payload: { expoPushToken: token('owned') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ removed: false });
    expect(await registry.listByAccount(owner)).toHaveLength(1);

    await app.close();
  });
});
