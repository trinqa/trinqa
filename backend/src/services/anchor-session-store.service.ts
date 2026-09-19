import { randomUUID } from 'node:crypto';

export type AnchorSessionRecord = {
  jwt: string;
  accountId: string;
  expiresAt: number;
};

/** In-memory SEP-10 JWT store — never returned to mobile clients. */
export class AnchorSessionStore {
  private readonly sessions = new Map<string, AnchorSessionRecord>();

  create(jwt: string, accountId: string, ttlMs = 55 * 60 * 1000): { sessionId: string; expiresAt: string } {
    const sessionId = randomUUID();
    const expiresAt = Date.now() + ttlMs;
    this.sessions.set(sessionId, { jwt, accountId, expiresAt });
    return { sessionId, expiresAt: new Date(expiresAt).toISOString() };
  }

  resolve(sessionId: string, expectedAccount?: string): string {
    const rec = this.sessions.get(sessionId);
    if (!rec) {
      throw new Error('ANCHOR_SESSION_NOT_FOUND');
    }
    if (Date.now() > rec.expiresAt) {
      this.sessions.delete(sessionId);
      throw new Error('ANCHOR_SESSION_EXPIRED');
    }
    if (expectedAccount && rec.accountId !== expectedAccount) {
      throw new Error('ANCHOR_SESSION_ACCOUNT_MISMATCH');
    }
    return rec.jwt;
  }

  /** Account the session was authenticated for (validates expiry like resolve). */
  accountFor(sessionId: string): string {
    this.resolve(sessionId);
    return this.sessions.get(sessionId)!.accountId;
  }
}
