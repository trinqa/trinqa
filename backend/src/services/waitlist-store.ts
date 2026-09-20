import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export interface WaitlistEntry {
  email: string;
  name?: string;
  source?: string;
  joinedAt: string;
}

export interface WaitlistJoinInput {
  email: string;
  name?: string;
  source?: string;
}

export interface WaitlistStore {
  join(input: WaitlistJoinInput): Promise<{ alreadyJoined: boolean }>;
  count(): Promise<number>;
  list(limit?: number): Promise<WaitlistEntry[]>;
  close(): Promise<void>;
}

/** One signup is one row: the address decides identity, so it is stored normalised. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Local/dev fallback: a JSON file next to the operation store. Ephemeral on a
 * container without a volume, which is exactly why production uses Postgres.
 */
export class JsonFileWaitlistStore implements WaitlistStore {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'waitlist.json');
  }

  private read(): WaitlistEntry[] {
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as WaitlistEntry[];
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  private write(entries: WaitlistEntry[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2), 'utf8');
  }

  async join(input: WaitlistJoinInput): Promise<{ alreadyJoined: boolean }> {
    const email = normaliseEmail(input.email);
    const entries = this.read();
    if (entries.some((e) => normaliseEmail(e.email) === email)) {
      return { alreadyJoined: true };
    }
    entries.push({
      email,
      name: input.name,
      source: input.source,
      joinedAt: new Date().toISOString(),
    });
    this.write(entries);
    return { alreadyJoined: false };
  }

  async count(): Promise<number> {
    return this.read().length;
  }

  async list(limit = 1000): Promise<WaitlistEntry[]> {
    return this.read().slice(-limit).reverse();
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS waitlist_entries (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       text NOT NULL UNIQUE,
    name        text,
    source      text,
    joined_at   timestamptz NOT NULL DEFAULT now()
  );
`;

/**
 * node-postgres is changing what `sslmode=require` in a URL means, so the TLS decision
 * is taken here instead: verified TLS when the provider asks for SSL, and the parameter
 * is removed from the string so the driver does not reinterpret it later.
 */
export function splitSslMode(connectionString: string): {
  url: string;
  ssl: { rejectUnauthorized: boolean } | undefined;
} {
  try {
    const parsed = new URL(connectionString);
    const mode = parsed.searchParams.get('sslmode');
    if (!mode) return { url: connectionString, ssl: undefined };
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('channel_binding');
    return {
      url: parsed.toString(),
      ssl: mode === 'disable' ? undefined : { rejectUnauthorized: mode !== 'no-verify' },
    };
  } catch {
    return { url: connectionString, ssl: undefined };
  }
}

/** Production store: survives redeploys, and the unique constraint does the de-duplication. */
export class PostgresWaitlistStore implements WaitlistStore {
  private readonly pool: pg.Pool;
  private migrated: Promise<void> | null = null;

  constructor(connectionString: string) {
    const { url, ssl } = splitSslMode(connectionString);
    this.pool = new pg.Pool({
      connectionString: url,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl,
    });
    // A pool error with no listener takes the process down.
    this.pool.on('error', () => undefined);
  }

  /** Runs once per process; concurrent callers await the same promise. */
  async migrate(): Promise<void> {
    if (!this.migrated) {
      this.migrated = this.pool.query(CREATE_TABLE_SQL).then(() => undefined);
      this.migrated.catch(() => {
        this.migrated = null;
      });
    }
    return this.migrated;
  }

  async join(input: WaitlistJoinInput): Promise<{ alreadyJoined: boolean }> {
    await this.migrate();
    const email = normaliseEmail(input.email);
    const result = await this.pool.query(
      `INSERT INTO waitlist_entries (email, name, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, input.name ?? null, input.source ?? null],
    );
    return { alreadyJoined: result.rowCount === 0 };
  }

  async count(): Promise<number> {
    await this.migrate();
    const result = await this.pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM waitlist_entries',
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async list(limit = 1000): Promise<WaitlistEntry[]> {
    await this.migrate();
    const result = await this.pool.query<{
      email: string;
      name: string | null;
      source: string | null;
      joined_at: Date;
    }>(
      'SELECT email, name, source, joined_at FROM waitlist_entries ORDER BY joined_at DESC LIMIT $1',
      [Math.min(Math.max(limit, 1), 10_000)],
    );
    return result.rows.map((row) => ({
      email: row.email,
      name: row.name ?? undefined,
      source: row.source ?? undefined,
      joinedAt: row.joined_at.toISOString(),
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Postgres when a connection string is configured, JSON file otherwise. */
export function createWaitlistStore(dataDir: string, databaseUrl?: string): WaitlistStore {
  if (databaseUrl) {
    return new PostgresWaitlistStore(databaseUrl);
  }
  return new JsonFileWaitlistStore(dataDir);
}
