import { describe, expect, it } from 'vitest';
import { AnchorSessionStore } from '../../src/services/anchor-session-store.service.js';

describe('AnchorSessionStore', () => {
  it('stores JWT and resolves by sessionId', () => {
    const store = new AnchorSessionStore();
    const { sessionId } = store.create('jwt-token', 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    expect(store.resolve(sessionId)).toBe('jwt-token');
  });

  it('rejects account mismatch when expected', () => {
    const store = new AnchorSessionStore();
    const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const { sessionId } = store.create('jwt-token', account);
    expect(() => store.resolve(sessionId, 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB')).toThrow(
      'ANCHOR_SESSION_ACCOUNT_MISMATCH',
    );
  });
});
