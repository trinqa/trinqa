import type { FastifyReply } from 'fastify';
import { ApiError } from '../../domain/api-errors.js';

export function sendApiError(reply: FastifyReply, err: unknown) {
  if (err instanceof ApiError) {
    return reply.status(err.statusCode).send({
      error: err.code,
      message: err.message,
      details: err.details ?? null,
    });
  }
  throw err;
}
