import { normalizeProviderError } from '../util/provider-error.js';
import type { HorizonCursorStore } from './horizon-cursor-store.js';
import { moneyArrived } from './notification-copy.js';
import type { PushLogger, PushSender } from './push-sender.service.js';
import type { PushTokenRegistry } from './push-tokens.service.js';
import type { StellarService } from './stellar.service.js';

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_PAGE_LIMIT = 50;

/** Horizon operation types that can credit an asset to an account. */
const CREDITING_TYPES = new Set([
  'payment',
  'path_payment_strict_receive',
  'path_payment_strict_send',
]);

/** The Horizon payment fields the watcher reads, in Horizon's own JSON spelling. */
export interface HorizonPaymentRecord {
  type?: string;
  paging_token?: string;
  asset_code?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  amount?: string;
  transaction_hash?: string;
}

export interface HorizonPaymentSource {
  /** Payments for one account strictly after `cursor`, oldest first. */
  paymentsAfter(accountId: string, cursor: string, limit: number): Promise<HorizonPaymentRecord[]>;
  /** The account's newest payment, used to pin a first-seen account to the present. */
  latestPayment(accountId: string): Promise<HorizonPaymentRecord | null>;
}

export function createHorizonPaymentSource(stellar: StellarService): HorizonPaymentSource {
  return {
    async paymentsAfter(accountId, cursor, limit) {
      let builder = stellar.horizon.payments().forAccount(accountId).order('asc').limit(limit);
      // An empty cursor is a real position ("from the beginning"), but Horizon wants it omitted.
      if (cursor) builder = builder.cursor(cursor);
      const page = await builder.call();
      return page.records as unknown as HorizonPaymentRecord[];
    },
    async latestPayment(accountId) {
      const page = await stellar.horizon.payments().forAccount(accountId).order('desc').limit(1).call();
      return (page.records[0] as unknown as HorizonPaymentRecord | undefined) ?? null;
    },
  };
}

export interface IncomingPaymentWatcherOptions {
  intervalMs?: number;
  pageLimit?: number;
  logger?: PushLogger;
}

export interface WatchedAsset {
  code: string;
  issuer: string;
}

const consoleLogger: PushLogger = {
  warn(details, message) {
    console.warn(`[push-watcher] ${message}`, details);
  },
};

/**
 * Notices money arriving while nobody is using the app.
 *
 * The backend is request-driven, so an event that happens with the app closed is invisible to
 * it. The ledger is the one thing that is always observable, so this polls Horizon for
 * incoming USDC and notifies the recipient. It also covers a completed anchor deposit, since
 * the anchor credits the USDC on chain.
 *
 * Nothing here is allowed to escape: a Horizon outage, a bad cursor or an Expo error leaves a
 * log line and the cursor untouched, so the same window is retried on the next tick.
 */
export class IncomingPaymentWatcher {
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private readonly logger: PushLogger;

  constructor(
    private readonly registry: PushTokenRegistry,
    private readonly sender: PushSender,
    private readonly payments: HorizonPaymentSource,
    private readonly cursors: HorizonCursorStore,
    private readonly asset: WatchedAsset,
    private readonly options: IncomingPaymentWatcherOptions = {},
  ) {
    this.logger = options.logger ?? consoleLogger;
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.intervalMs ?? DEFAULT_INTERVAL_MS);
    // A background courtesy must never be the reason the process refuses to exit.
    this.timer.unref();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** One pass over every account that has a registered device. Never rejects. */
  async tick(): Promise<void> {
    // A slow Horizon must not stack passes on top of each other.
    if (this.ticking) return;
    this.ticking = true;
    try {
      const accounts = await this.registry.listAccounts();
      for (const accountId of accounts) {
        await this.checkAccount(accountId);
      }
    } catch (err) {
      this.logger.warn({ error: normalizeProviderError(err) }, 'watcher tick failed');
    } finally {
      this.ticking = false;
    }
  }

  private async checkAccount(accountId: string): Promise<void> {
    try {
      const cursor = await this.cursors.get(accountId);
      if (cursor === undefined) {
        // First sight of this account: start from now, never from its whole history.
        const latest = await this.payments.latestPayment(accountId);
        await this.cursors.set(accountId, latest?.paging_token ?? '');
        return;
      }

      const records = await this.payments.paymentsAfter(
        accountId,
        cursor,
        this.options.pageLimit ?? DEFAULT_PAGE_LIMIT,
      );

      let next = cursor;
      for (const record of records) {
        // Advance past records we ignore too, or one unrelated payment stalls the cursor forever.
        if (typeof record.paging_token === 'string') next = record.paging_token;
        if (!this.isIncoming(record, accountId)) continue;
        await this.sender.notify(accountId, moneyArrived(record.amount, record.transaction_hash));
      }
      if (next !== cursor) await this.cursors.set(accountId, next);
    } catch (err) {
      this.logger.warn(
        { accountId, error: normalizeProviderError(err) },
        'could not read incoming payments',
      );
    }
  }

  private isIncoming(record: HorizonPaymentRecord, accountId: string): boolean {
    if (!record.type || !CREDITING_TYPES.has(record.type)) return false;
    if (record.to !== accountId) return false;
    // Moving money between an account's own balances is not news.
    if (record.from === accountId) return false;
    return record.asset_code === this.asset.code && record.asset_issuer === this.asset.issuer;
  }
}
