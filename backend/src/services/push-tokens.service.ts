import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../domain/api-errors.js';

export type DevicePlatform = 'ios' | 'android';

export interface DeviceToken {
  /** Stellar account the device's custodial wallet resolves to; notifications are addressed by this. */
  accountId: string;
  expoPushToken: string;
  platform: DevicePlatform;
  updatedAt: string;
}

export interface RegisterDeviceInput {
  accountId: string;
  expoPushToken: string;
  platform: DevicePlatform;
}

export interface PushTokenRegistry {
  register(input: RegisterDeviceInput): Promise<DeviceToken>;
  listByAccount(accountId: string): Promise<DeviceToken[]>;
  /** Every account with at least one device — the set the background watcher polls for. */
  listAccounts(): Promise<string[]>;
  remove(expoPushToken: string): Promise<boolean>;
  removeMany(expoPushTokens: readonly string[]): Promise<number>;
}

/** Expo's own token shape; both spellings are issued in the wild. */
const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\s[\]]+\]$/;

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && EXPO_PUSH_TOKEN_PATTERN.test(value);
}

/** Tokens are device identifiers, not secrets — but they still never belong in a log line in full. */
export function maskPushToken(token: string): string {
  return `…${token.slice(-6)}`;
}

function assertValid(input: RegisterDeviceInput): void {
  if (!isExpoPushToken(input.expoPushToken)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid Expo push token', 400);
  }
  if (input.platform !== 'ios' && input.platform !== 'android') {
    throw new ApiError('VALIDATION_ERROR', 'platform must be ios or android', 400);
  }
}

function toRecord(input: RegisterDeviceInput): DeviceToken {
  return {
    accountId: input.accountId,
    expoPushToken: input.expoPushToken,
    platform: input.platform,
    updatedAt: new Date().toISOString(),
  };
}

function distinctAccounts(devices: Iterable<DeviceToken>): string[] {
  return [...new Set([...devices].map((d) => d.accountId))];
}

function sortByAccount(devices: Iterable<DeviceToken>, accountId: string): DeviceToken[] {
  return [...devices]
    .filter((d) => d.accountId === accountId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export class MemoryPushTokenRegistry implements PushTokenRegistry {
  /** Keyed by token, so one token can never be attached to two accounts. */
  private readonly devices = new Map<string, DeviceToken>();

  async register(input: RegisterDeviceInput): Promise<DeviceToken> {
    assertValid(input);
    const record = toRecord(input);
    this.devices.set(record.expoPushToken, record);
    return record;
  }

  async listByAccount(accountId: string): Promise<DeviceToken[]> {
    return sortByAccount(this.devices.values(), accountId);
  }

  async listAccounts(): Promise<string[]> {
    return distinctAccounts(this.devices.values());
  }

  async remove(expoPushToken: string): Promise<boolean> {
    return this.devices.delete(expoPushToken);
  }

  async removeMany(expoPushTokens: readonly string[]): Promise<number> {
    let removed = 0;
    for (const token of expoPushTokens) {
      if (this.devices.delete(token)) removed += 1;
    }
    return removed;
  }
}

type Persisted = { devices: DeviceToken[] };

export class JsonFilePushTokenRegistry implements PushTokenRegistry {
  private devices = new Map<string, DeviceToken>();
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
      fs.writeFileSync(this.filePath, JSON.stringify({ devices: [] } satisfies Persisted));
      return;
    }
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Persisted;
    for (const device of raw.devices ?? []) {
      this.devices.set(device.expoPushToken, device);
    }
  }

  private persist(): void {
    const devices = [...this.devices.values()];
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ devices } satisfies Persisted, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  async register(input: RegisterDeviceInput): Promise<DeviceToken> {
    assertValid(input);
    this.ensureLoaded();
    const record = toRecord(input);
    this.devices.set(record.expoPushToken, record);
    this.persist();
    return record;
  }

  async listByAccount(accountId: string): Promise<DeviceToken[]> {
    this.ensureLoaded();
    return sortByAccount(this.devices.values(), accountId);
  }

  async listAccounts(): Promise<string[]> {
    this.ensureLoaded();
    return distinctAccounts(this.devices.values());
  }

  async remove(expoPushToken: string): Promise<boolean> {
    this.ensureLoaded();
    if (!this.devices.delete(expoPushToken)) return false;
    this.persist();
    return true;
  }

  async removeMany(expoPushTokens: readonly string[]): Promise<number> {
    this.ensureLoaded();
    let removed = 0;
    for (const token of expoPushTokens) {
      if (this.devices.delete(token)) removed += 1;
    }
    if (removed > 0) this.persist();
    return removed;
  }
}

export function createPushTokenRegistry(dataDir: string): PushTokenRegistry {
  if (process.env.NODE_ENV === 'test') {
    return new MemoryPushTokenRegistry();
  }
  return new JsonFilePushTokenRegistry(path.join(dataDir, 'push-tokens.json'));
}
