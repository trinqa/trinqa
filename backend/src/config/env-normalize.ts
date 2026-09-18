import { z } from 'zod';

/** Treat blank env values as unset (undefined). */
export function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
