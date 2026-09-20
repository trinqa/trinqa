import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { AnchorRegistry, createAnchorRegistry } from '../../src/services/anchor-registry.service.js';
import { registerAnchorDirectoryRoutes } from '../../src/routes/v1/anchors.js';
import type { AnchorAdapter, AnchorSnapshot } from '../../src/domain/anchor.js';

function fakeAdapter(id: string, snapshot: () => Promise<AnchorSnapshot>): AnchorAdapter {
  return { id, domain: id, snapshot };
}

function executableSnapshot(id: string): AnchorSnapshot {
  return {
    id,
    domain: id,
    name: id,
    status: 'EXECUTABLE',
    seps: ['sep1', 'sep6'],
    rails: [],
    healthy: true,
    network: 'testnet',
    fetchedAt: new Date().toISOString(),
  };
}

describe('AnchorRegistry', () => {
  it('turns a rejected snapshot into an UNAVAILABLE entry instead of throwing', async () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const broken = fakeAdapter('broken-anchor.test', async () => {
      throw new Error('boom');
    });

    const registry = new AnchorRegistry(trMock, []);
    // Inject the broken adapter directly to simulate a discovery adapter that rejects.
    (registry as unknown as { adapters: Map<string, AnchorAdapter> }).adapters.set('broken-anchor.test', broken);

    const list = await registry.list();
    const brokenEntry = list.find((s) => s.id === 'broken-anchor.test');
    expect(brokenEntry).toBeDefined();
    expect(brokenEntry?.status).toBe('UNAVAILABLE');
    expect(brokenEntry?.statusReason).toContain('boom');
    expect(brokenEntry?.healthy).toBe(false);

    const trEntry = list.find((s) => s.id === 'tr-mock-anchor.fly.dev');
    expect(trEntry?.status).toBe('EXECUTABLE');
  });

  it('adapter(id) returns the registered adapter by id', () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const registry = new AnchorRegistry(trMock, []);
    expect(registry.adapter('tr-mock-anchor.fly.dev')).toBe(trMock);
    expect(registry.adapter('nope')).toBeUndefined();
  });
});

describe('createAnchorRegistry', () => {
  it('dedupes the TR mock domain out of the discovery domain list', () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const registry = createAnchorRegistry(
      { ANCHOR_DISCOVERY_DOMAINS: 'tr-mock-anchor.fly.dev,testanchor.stellar.org' },
      trMock,
    );
    expect(registry.adapter('tr-mock-anchor.fly.dev')).toBe(trMock);
    expect(registry.adapter('testanchor.stellar.org')).toBeDefined();
  });

  it('falls back to the default public discovery domains when unset', () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const registry = createAnchorRegistry({ ANCHOR_DISCOVERY_DOMAINS: undefined }, trMock);
    expect(registry.adapter('testanchor.stellar.org')).toBeDefined();
    expect(registry.adapter('extstellar.moneygram.com')).toBeDefined();
  });
});

describe('GET /api/v1/anchors', () => {
  it('returns the anchor directory snapshots', async () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const registry = new AnchorRegistry(trMock, []);

    const app = Fastify();
    registerAnchorDirectoryRoutes(app, registry);

    const res = await app.inject({ method: 'GET', url: '/api/v1/anchors' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { anchors: AnchorSnapshot[] };
    expect(body.anchors).toHaveLength(1);
    expect(body.anchors[0]?.id).toBe('tr-mock-anchor.fly.dev');

    await app.close();
  });

  it('never throws even when a directory adapter fails', async () => {
    const trMock = fakeAdapter('tr-mock-anchor.fly.dev', async () => executableSnapshot('tr-mock-anchor.fly.dev'));
    const directory = {
      list: vi.fn(async () => [
        executableSnapshot('tr-mock-anchor.fly.dev'),
        {
          id: 'broken.test',
          domain: 'broken.test',
          name: 'broken.test',
          status: 'UNAVAILABLE' as const,
          statusReason: 'boom',
          seps: [],
          rails: [],
          healthy: false,
          network: 'testnet' as const,
          fetchedAt: new Date().toISOString(),
        },
      ]),
      adapter: () => trMock,
    };

    const app = Fastify();
    registerAnchorDirectoryRoutes(app, directory);
    const res = await app.inject({ method: 'GET', url: '/api/v1/anchors' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { anchors: AnchorSnapshot[] };
    expect(body.anchors).toHaveLength(2);

    await app.close();
  });
});
