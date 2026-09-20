import fs from 'node:fs';
import path from 'node:path';

/**
 * Per-account Horizon paging cursor for the incoming-payment watcher.
 *
 * `undefined` means "never looked at this account": the watcher pins such an account to the
 * present instead of replaying its whole payment history. The empty string means "seen, but
 * the account had no payments yet", which is a real position and must survive a restart.
 */
export interface HorizonCursorStore {
  get(accountId: string): Promise<string | undefined>;
  set(accountId: string, cursor: string): Promise<void>;
}

export class MemoryHorizonCursorStore implements HorizonCursorStore {
  private readonly cursors = new Map<string, string>();

  async get(accountId: string): Promise<string | undefined> {
    return this.cursors.get(accountId);
  }

  async set(accountId: string, cursor: string): Promise<void> {
    this.cursors.set(accountId, cursor);
  }
}

type Persisted = { cursors: Record<string, string> };

export class JsonFileHorizonCursorStore implements HorizonCursorStore {
  private cursors = new Map<string, string>();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ cursors: {} } satisfies Persisted));
      return;
    }
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Persisted;
    for (const [accountId, cursor] of Object.entries(raw.cursors ?? {})) {
      if (typeof cursor === 'string') this.cursors.set(accountId, cursor);
    }
  }

  private persist(): void {
    const cursors = Object.fromEntries(this.cursors);
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ cursors } satisfies Persisted, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  async get(accountId: string): Promise<string | undefined> {
    this.ensureLoaded();
    return this.cursors.get(accountId);
  }

  async set(accountId: string, cursor: string): Promise<void> {
    this.ensureLoaded();
    if (this.cursors.get(accountId) === cursor) return;
    this.cursors.set(accountId, cursor);
    this.persist();
  }
}

export function createHorizonCursorStore(dataDir: string): HorizonCursorStore {
  if (process.env.NODE_ENV === 'test') {
    return new MemoryHorizonCursorStore();
  }
  return new JsonFileHorizonCursorStore(path.join(dataDir, 'horizon-cursors.json'));
}
