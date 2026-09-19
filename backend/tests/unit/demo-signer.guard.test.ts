import { describe, expect, it } from 'vitest';
import { demoTokenAccepted } from '../../src/guards/demo-signer.guard.js';
import { assertDemoAccessConfigured } from '../../src/config/env.js';

describe('demo access token', () => {
  it('is open when no token is configured (local dev)', () => {
    expect(demoTokenAccepted(undefined, undefined)).toBe(true);
  });

  it('requires the exact token once configured', () => {
    const token = 'a-long-random-demo-token';
    expect(demoTokenAccepted(token, token)).toBe(true);
    expect(demoTokenAccepted(token, undefined)).toBe(false);
    expect(demoTokenAccepted(token, 'wrong')).toBe(false);
    expect(demoTokenAccepted(token, `${token}x`)).toBe(false);
  });

  it('refuses to boot a production demo signer without a token', () => {
    expect(() =>
      assertDemoAccessConfigured({ NODE_ENV: 'production', DEMO_SIGNER_ENABLED: true, DEMO_ACCESS_TOKEN: undefined }),
    ).toThrow(/DEMO_ACCESS_TOKEN/);
    expect(() =>
      assertDemoAccessConfigured({ NODE_ENV: 'production', DEMO_SIGNER_ENABLED: true, DEMO_ACCESS_TOKEN: 'x'.repeat(24) }),
    ).not.toThrow();
    expect(() =>
      assertDemoAccessConfigured({ NODE_ENV: 'development', DEMO_SIGNER_ENABLED: true, DEMO_ACCESS_TOKEN: undefined }),
    ).not.toThrow();
  });
});
