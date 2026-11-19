import { createHash, randomBytes } from 'node:crypto';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { AppError } from '../errors';

const ISSUER = 'sonora-api';
const AUDIENCE = 'sonora-app';

export interface AccessTokenIssuer {
  sign(userId: string, now?: Date): Promise<{ token: string; expiresAt: Date }>;
  verify(token: string): Promise<{ userId: string }>;
}

export function createAccessTokens(secret: string, ttlSeconds: number): AccessTokenIssuer {
  const key = new TextEncoder().encode(secret);
  return {
    async sign(userId, now = new Date()) {
      const iat = Math.floor(now.getTime() / 1000);
      const exp = iat + ttlSeconds;
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(key);
      return { token, expiresAt: new Date(exp * 1000) };
    },
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256'],
          issuer: ISSUER,
          audience: AUDIENCE,
        });
        if (!payload.sub) throw new AppError('UNAUTHORIZED', 'Invalid access token');
        return { userId: payload.sub };
      } catch (err) {
        if (err instanceof joseErrors.JWTExpired) {
          throw new AppError('TOKEN_EXPIRED', 'Access token expired');
        }
        if (err instanceof AppError) throw err;
        throw new AppError('UNAUTHORIZED', 'Invalid access token');
      }
    },
  };
}

/** 32 random bytes, base64url: the raw refresh token handed to the client once. */
export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only this SHA-256 digest is stored. Refresh tokens have 256 bits of entropy, so no salt is needed. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
