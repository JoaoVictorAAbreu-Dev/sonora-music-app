import type { FastifyError, FastifyInstance } from 'fastify';
import type { z } from 'zod';
import {
  errorStatus,
  toFieldIssues,
  type ApiError,
  type ErrorCode,
  type FieldIssue,
} from '@sonora/shared';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: FieldIssue[],
  ) {
    super(message);
  }
}

/** Validates any input with Zod, throwing the shared VALIDATION_ERROR error. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError('VALIDATION_ERROR', 'Invalid request', toFieldIssues(r.error));
  return r.data;
}

function body(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: FieldIssue[],
): ApiError {
  return { error: { code, message, requestId, ...(details ? { details } : {}) } };
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(errorStatus[err.code])
        .send(body(err.code, err.message, req.id, err.details));
    }
    const status = (err as FastifyError).statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send(body('RATE_LIMITED', 'Too many requests', req.id));
    }
    if (status >= 400 && status < 500) {
      // Malformed JSON (400), payload too large (413), unsupported media type (415), etc.
      return reply.status(status).send(body('VALIDATION_ERROR', 'Invalid request', req.id));
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send(body('INTERNAL', 'Something went wrong', req.id));
  });

  app.setNotFoundHandler((req, reply) =>
    reply.status(404).send(body('NOT_FOUND', 'Route not found', req.id)),
  );
}
