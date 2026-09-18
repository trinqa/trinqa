import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Operation, OperationKind, OperationStatus } from '../domain/operation.js';

export interface OperationStore {
  create(input: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Operation>;
  update(id: string, patch: Partial<Operation>): Promise<Operation>;
  get(id: string): Promise<Operation | null>;
  findByExternalRef(field: keyof NonNullable<Operation['externalRefs']>, value: string): Promise<Operation | null>;
  listByAccount(accountId: string, limit?: number): Promise<Operation[]>;
}

export class MemoryOperationStore implements OperationStore {
  private readonly ops = new Map<string, Operation>();

  async create(input: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Operation> {
    const now = new Date().toISOString();
    const op: Operation = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.ops.set(op.id, op);
    return op;
  }

  async update(id: string, patch: Partial<Operation>): Promise<Operation> {
    const existing = this.ops.get(id);
    if (!existing) {
      throw new Error(`Operation not found: ${id}`);
    }
    const updated: Operation = {
      ...existing,
      ...patch,
      externalRefs: patch.externalRefs
        ? { ...existing.externalRefs, ...patch.externalRefs }
        : existing.externalRefs,
      metadata: patch.metadata ? { ...existing.metadata, ...patch.metadata } : existing.metadata,
      updatedAt: new Date().toISOString(),
    };
    this.ops.set(id, updated);
    return updated;
  }

  async get(id: string): Promise<Operation | null> {
    return this.ops.get(id) ?? null;
  }

  async listByAccount(accountId: string, limit = 50): Promise<Operation[]> {
    return [...this.ops.values()]
      .filter((o) => o.accountId === accountId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  async findByExternalRef(
    field: keyof NonNullable<Operation['externalRefs']>,
    value: string,
  ): Promise<Operation | null> {
    for (const op of this.ops.values()) {
      if (op.externalRefs?.[field] === value) {
        return op;
      }
    }
    return null;
  }
}

type Persisted = { operations: Operation[] };

export class JsonFileOperationStore implements OperationStore {
  private ops = new Map<string, Operation>();
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
      fs.writeFileSync(this.filePath, JSON.stringify({ operations: [] } satisfies Persisted));
      return;
    }
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Persisted;
    for (const op of raw.operations ?? []) {
      this.ops.set(op.id, op);
    }
  }

  private persist(): void {
    const operations = [...this.ops.values()];
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ operations } satisfies Persisted, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  async create(input: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Operation> {
    this.ensureLoaded();
    const now = new Date().toISOString();
    const op: Operation = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.ops.set(op.id, op);
    this.persist();
    return op;
  }

  async update(id: string, patch: Partial<Operation>): Promise<Operation> {
    this.ensureLoaded();
    const existing = this.ops.get(id);
    if (!existing) throw new Error(`Operation not found: ${id}`);
    const updated: Operation = {
      ...existing,
      ...patch,
      externalRefs: patch.externalRefs
        ? { ...existing.externalRefs, ...patch.externalRefs }
        : existing.externalRefs,
      metadata: patch.metadata ? { ...existing.metadata, ...patch.metadata } : existing.metadata,
      updatedAt: new Date().toISOString(),
    };
    this.ops.set(id, updated);
    this.persist();
    return updated;
  }

  async get(id: string): Promise<Operation | null> {
    this.ensureLoaded();
    return this.ops.get(id) ?? null;
  }

  async listByAccount(accountId: string, limit = 50): Promise<Operation[]> {
    this.ensureLoaded();
    return [...this.ops.values()]
      .filter((o) => o.accountId === accountId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  async findByExternalRef(
    field: keyof NonNullable<Operation['externalRefs']>,
    value: string,
  ): Promise<Operation | null> {
    this.ensureLoaded();
    for (const op of this.ops.values()) {
      if (op.externalRefs?.[field] === value) {
        return op;
      }
    }
    return null;
  }
}

export function createOperationStore(dataDir: string): OperationStore {
  const file = path.join(dataDir, 'operations.json');
  if (process.env.NODE_ENV === 'test') {
    return new MemoryOperationStore();
  }
  return new JsonFileOperationStore(file);
}

export async function recordOperation(
  store: OperationStore,
  input: {
    kind: OperationKind;
    status?: OperationStatus;
    accountId: string;
    title: string;
    subtitle?: string;
    amount?: Operation['amount'];
    externalRefs?: Operation['externalRefs'];
    metadata?: Record<string, unknown>;
  },
): Promise<Operation> {
  return store.create({
    kind: input.kind,
    status: input.status ?? 'pending',
    accountId: input.accountId,
    title: input.title,
    subtitle: input.subtitle,
    amount: input.amount,
    externalRefs: input.externalRefs,
    metadata: input.metadata,
  });
}
