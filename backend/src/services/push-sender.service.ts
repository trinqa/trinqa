import { z } from 'zod';
import { normalizeProviderError } from '../util/provider-error.js';
import { maskPushToken, type PushTokenRegistry } from './push-tokens.service.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
/** Expo's documented per-request ceiling. */
const MAX_MESSAGES_PER_REQUEST = 100;
const DEFAULT_TIMEOUT_MS = 5000;

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  /** Devices the Expo API accepted a ticket for. */
  sent: number;
  failed: number;
  /** Tokens dropped from the registry because Expo reported DeviceNotRegistered. */
  pruned: number;
}

export interface PushSender {
  notify(accountId: string, notification: PushNotification): Promise<PushSendResult>;
}

/** Minimal sink so the sender can log without owning a Fastify instance. */
export interface PushLogger {
  warn(details: Record<string, unknown>, message: string): void;
}

export interface ExpoPushSenderOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
  logger?: PushLogger;
}

const ticketSchema = z.union([
  z.object({ status: z.literal('ok'), id: z.string().optional() }),
  z.object({
    status: z.literal('error'),
    message: z.string().optional(),
    details: z.object({ error: z.string().optional() }).passthrough().optional(),
  }),
]);

const responseSchema = z.object({ data: z.array(ticketSchema) });

const consoleLogger: PushLogger = {
  warn(details, message) {
    console.warn(`[push] ${message}`, details);
  },
};

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fan-out to every device of an account through Expo's push API.
 *
 * `notify` never throws: a notification is a courtesy on top of a payment, so a dead
 * token, a timeout or an Expo outage must not surface in the caller's flow.
 */
export class ExpoPushSender implements PushSender {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly endpoint: string;
  private readonly logger: PushLogger;

  constructor(
    private readonly registry: PushTokenRegistry,
    options: ExpoPushSenderOptions = {},
  ) {
    this.fetchFn = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.endpoint = options.endpoint ?? EXPO_PUSH_ENDPOINT;
    this.logger = options.logger ?? consoleLogger;
  }

  async notify(accountId: string, notification: PushNotification): Promise<PushSendResult> {
    const result: PushSendResult = { sent: 0, failed: 0, pruned: 0 };
    try {
      const devices = await this.registry.listByAccount(accountId);
      if (devices.length === 0) return result;

      const dead: string[] = [];
      for (const batch of chunk(devices, MAX_MESSAGES_PER_REQUEST)) {
        const tickets = await this.sendBatch(
          batch.map((d) => d.expoPushToken),
          notification,
        );
        if (tickets === null) {
          result.failed += batch.length;
          continue;
        }
        batch.forEach((device, index) => {
          const ticket = tickets[index];
          if (ticket?.status === 'ok') {
            result.sent += 1;
            return;
          }
          result.failed += 1;
          if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            dead.push(device.expoPushToken);
          }
        });
      }

      if (dead.length > 0) {
        result.pruned = await this.registry.removeMany(dead);
        this.logger.warn(
          { accountId, tokens: dead.map(maskPushToken) },
          'pruned tokens Expo reported as unregistered',
        );
      }
    } catch (err) {
      this.logger.warn({ accountId, error: normalizeProviderError(err) }, 'notify failed');
    }
    return result;
  }

  /** One Expo request; null means the whole batch could not be accounted for. */
  private async sendBatch(
    tokens: readonly string[],
    notification: PushNotification,
  ): Promise<z.infer<typeof ticketSchema>[] | null> {
    const messages = tokens.map((to) => ({
      to,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: 'default' as const,
    }));

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        this.logger.warn({ status: response.status, count: tokens.length }, 'expo push rejected the batch');
        return null;
      }
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        this.logger.warn({ count: tokens.length }, 'expo push returned an unexpected body');
        return null;
      }
      return parsed.data.data;
    } catch (err) {
      this.logger.warn(
        { count: tokens.length, error: normalizeProviderError(err) },
        'expo push request failed',
      );
      return null;
    }
  }
}

export function createPushSender(
  registry: PushTokenRegistry,
  options: ExpoPushSenderOptions = {},
): PushSender {
  return new ExpoPushSender(registry, options);
}
