import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors';
import type { AccessTokenIssuer } from './tokens';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/** preHandler that requires `Authorization: Bearer <access token>`. */
export function requireAuth(accessTokens: AccessTokenIssuer) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const header = req.headers.authorization;
    const token = header?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token) throw new AppError('UNAUTHORIZED', 'Missing access token');
    req.userId = (await accessTokens.verify(token)).userId;
  };
}

export function currentUserId(req: FastifyRequest): string {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Not signed in');
  return req.userId;
}
