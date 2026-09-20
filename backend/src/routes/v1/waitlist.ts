import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { WaitlistStore } from '../../services/waitlist-store.js';

const joinSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).optional(),
  source: z.string().trim().max(64).optional(),
});

const exportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10_000).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function toCsv(entries: Array<{ email: string; name?: string; source?: string; joinedAt: string }>): string {
  const escape = (value: string | undefined): string => `"${(value ?? '').replace(/"/g, '""')}"`;
  const header = 'email,name,source,joined_at';
  const rows = entries.map((e) => [e.email, e.name, e.source, e.joinedAt].map(escape).join(','));
  return [header, ...rows].join('\n');
}

export interface WaitlistRouteOptions {
  /** Shared secret for the export endpoint (header x-waitlist-token). Export is off when unset. */
  adminToken?: string;
}

export function registerWaitlistRoutes(
  app: FastifyInstance,
  store: WaitlistStore,
  options: WaitlistRouteOptions = {},
): void {
  app.post('/api/v1/waitlist', async (request, reply) => {
    const parsed = joinSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { email, name, source } = parsed.data;
    try {
      const { alreadyJoined } = await store.join({ email, name, source });
      if (alreadyJoined) {
        return reply.send({ success: true, message: "You're already on the list!", alreadyJoined: true });
      }
      app.log.info({ email }, 'waitlist: new entry');
      return reply.status(201).send({ success: true, message: "You're on the list!", alreadyJoined: false });
    } catch (err) {
      app.log.error({ err }, 'waitlist: join failed');
      return reply.status(503).send({ error: 'Waitlist is temporarily unavailable. Please try again.' });
    }
  });

  app.get('/api/v1/waitlist/count', async (_request, reply) => {
    try {
      return { count: await store.count() };
    } catch (err) {
      app.log.error({ err }, 'waitlist: count failed');
      return reply.status(503).send({ error: 'Waitlist is temporarily unavailable.' });
    }
  });

  // Reading the list means reading everyone's address, so it needs the shared secret.
  app.get('/api/v1/waitlist/export', async (request, reply) => {
    const expected = options.adminToken;
    if (!expected) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const header = request.headers['x-waitlist-token'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !tokenMatches(provided, expected)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const query = exportQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid request', details: query.error.flatten() });
    }

    try {
      const entries = await store.list(query.data.limit ?? 1000);
      if (query.data.format === 'csv') {
        return reply
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', 'attachment; filename="trinqa-waitlist.csv"')
          .send(toCsv(entries));
      }
      return reply.send({ count: entries.length, entries });
    } catch (err) {
      app.log.error({ err }, 'waitlist: export failed');
      return reply.status(503).send({ error: 'Waitlist is temporarily unavailable.' });
    }
  });
}
