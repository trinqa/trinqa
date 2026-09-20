import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerWaitlistRoutes } from '../../src/routes/v1/waitlist.js';
import {
  JsonFileWaitlistStore,
  splitSslMode,
  type WaitlistStore,
} from '../../src/services/waitlist-store.js';
import { resolveCorsOrigins } from '../../src/config/env.js';

function buildApp(store: WaitlistStore, adminToken?: string) {
  const app = Fastify();
  registerWaitlistRoutes(app, store, { adminToken });
  return app;
}

describe('waitlist routes', () => {
  let dataDir: string;
  let store: JsonFileWaitlistStore;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trinqa-waitlist-'));
    store = new JsonFileWaitlistStore(dataDir);
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('stores a signup, counts it, and reports a repeat as already joined', async () => {
    const app = buildApp(store);

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/waitlist',
      payload: { email: 'Ada@Example.com', name: 'Ada', source: 'landing' },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ success: true, alreadyJoined: false });

    // Same address, different casing and padding: still one person.
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/waitlist',
      payload: { email: '  ada@example.com ' },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ success: true, alreadyJoined: true });

    const count = await app.inject({ method: 'GET', url: '/api/v1/waitlist/count' });
    expect(count.json()).toEqual({ count: 1 });

    const persisted = JSON.parse(fs.readFileSync(path.join(dataDir, 'waitlist.json'), 'utf8'));
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ email: 'ada@example.com', name: 'Ada', source: 'landing' });
  });

  it('rejects a malformed address without writing anything', async () => {
    const app = buildApp(store);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/waitlist',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(await store.count()).toBe(0);
  });

  it('answers 503 instead of 500 when the store is down', async () => {
    const broken: WaitlistStore = {
      join: async () => {
        throw new Error('connection refused');
      },
      count: async () => {
        throw new Error('connection refused');
      },
      list: async () => [],
      close: async () => undefined,
    };
    const app = buildApp(broken);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/waitlist',
      payload: { email: 'ada@example.com' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatch(/temporarily unavailable/i);
  });

  it('keeps the export closed without a token and open with the right one', async () => {
    await store.join({ email: 'ada@example.com', name: 'Ada' });

    const noToken = buildApp(store);
    expect((await noToken.inject({ method: 'GET', url: '/api/v1/waitlist/export' })).statusCode).toBe(404);

    const app = buildApp(store, 'secret-token');
    const unauthorized = await app.inject({ method: 'GET', url: '/api/v1/waitlist/export' });
    expect(unauthorized.statusCode).toBe(401);

    const wrong = await app.inject({
      method: 'GET',
      url: '/api/v1/waitlist/export',
      headers: { 'x-waitlist-token': 'nope' },
    });
    expect(wrong.statusCode).toBe(401);

    const ok = await app.inject({
      method: 'GET',
      url: '/api/v1/waitlist/export',
      headers: { 'x-waitlist-token': 'secret-token' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ count: 1 });
    expect(ok.json().entries[0].email).toBe('ada@example.com');

    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/waitlist/export?format=csv',
      headers: { 'x-waitlist-token': 'secret-token' },
    });
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.body.split('\n')[0]).toBe('email,name,source,joined_at');
    expect(csv.body).toContain('"ada@example.com"');
  });
});

describe('CORS origins', () => {
  it('names the public site so the browser accepts the response', () => {
    const origins = resolveCorsOrigins({ CORS_ORIGINS: undefined } as never);
    expect(origins).toContain('https://trinqa.com');
    expect(origins).toContain('https://www.trinqa.com');
  });

  it('adds configured origins and still allows localhost', () => {
    const origins = resolveCorsOrigins({ CORS_ORIGINS: 'https://staging.trinqa.com, ' } as never);
    expect(origins).toContain('https://staging.trinqa.com');
    const localhost = origins.find((o): o is RegExp => o instanceof RegExp);
    expect(localhost?.test('http://localhost:5173')).toBe(true);
  });
});

describe('splitSslMode', () => {
  it('verifies TLS and drops the parameter the driver would reinterpret', () => {
    const { url, ssl } = splitSslMode(
      'postgresql://u:p@host.neon.tech/db?channel_binding=require&sslmode=require',
    );
    expect(url).not.toContain('sslmode');
    expect(url).not.toContain('channel_binding');
    expect(ssl).toEqual({ rejectUnauthorized: true });
  });

  it('leaves a plain connection string alone', () => {
    const { url, ssl } = splitSslMode('postgresql://u:p@localhost:5432/db');
    expect(url).toBe('postgresql://u:p@localhost:5432/db');
    expect(ssl).toBeUndefined();
  });

  it('honours sslmode=no-verify and sslmode=disable', () => {
    expect(splitSslMode('postgresql://u:p@h/db?sslmode=no-verify').ssl).toEqual({
      rejectUnauthorized: false,
    });
    expect(splitSslMode('postgresql://u:p@h/db?sslmode=disable').ssl).toBeUndefined();
  });
});
