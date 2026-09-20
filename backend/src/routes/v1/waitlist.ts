import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const joinSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
});

interface WaitlistEntry {
  email: string;
  name?: string;
  joinedAt: string;
}

function getWaitlistPath(dataDir: string): string {
  return path.join(dataDir, 'waitlist.json');
}

function readWaitlist(filePath: string): WaitlistEntry[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as WaitlistEntry[];
  } catch {
    return [];
  }
}

function writeWaitlist(filePath: string, entries: WaitlistEntry[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf8');
}

export function registerWaitlistRoutes(app: FastifyInstance, dataDir: string): void {
  app.post('/api/v1/waitlist', async (request, reply) => {
    const parsed = joinSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { email, name } = parsed.data;
    const filePath = getWaitlistPath(dataDir);
    const entries = readWaitlist(filePath);

    const existing = entries.find((e) => e.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return reply.send({ success: true, message: "You're already on the list!", alreadyJoined: true });
    }

    entries.push({ email, name, joinedAt: new Date().toISOString() });
    writeWaitlist(filePath, entries);

    app.log.info({ email }, 'waitlist: new entry');
    return reply.status(201).send({ success: true, message: "You're on the list!", alreadyJoined: false });
  });

  app.get('/api/v1/waitlist/count', async () => {
    const filePath = getWaitlistPath(dataDir);
    const entries = readWaitlist(filePath);
    return { count: entries.length };
  });
}
