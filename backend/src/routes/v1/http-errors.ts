import type { FastifyReply } from 'fastify';
import { ApiError } from '../../domain/api-errors.js';
import { AnchorRequestError } from '../../adapters/tr-mock-anchor.adapter.js';

export function sendApiError(reply: FastifyReply, err: unknown) {
  if (err instanceof ApiError) {
    return reply.status(err.statusCode).send({
      error: err.code,
      message: err.message,
      details: err.details ?? null,
    });
  }
  if (err instanceof AnchorRequestError && err.status >= 400 && err.status < 500) {
    return reply.status(422).send({
      error: 'ANCHOR_REJECTED',
      message: err.reason,
      details: { operation: err.operation, anchorStatus: err.status },
    });
  }
  throw err;
}
