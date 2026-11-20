import { createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { SocialProvider } from '@sonora/shared';
import { AppError } from '../errors';

/** What the API trusts after verifying a provider ID token. */
export interface VerifiedIdentity {
  provider: SocialProvider;
  subject: string;
  /** Lowercased; null when the provider did not share one. */
  email: string | null;
  emailVerified: boolean;
}

export interface ProviderConfig {
  issuers: string[];
  audiences: string[];
  keys: JWTVerifyGetKey;
}

export type SocialVerifier = (
  provider: SocialProvider,
  idToken: string,
  nonce: string | undefined,
) => Promise<VerifiedIdentity>;

export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const APPLE_ISSUERS = ['https://appleid.apple.com'];

/** Production key sets, fetched and cached by jose. */
export function remoteProviders(googleAudiences: string[], appleAudiences: string[]) {
  return {
    google: {
      issuers: GOOGLE_ISSUERS,
      audiences: googleAudiences,
      keys: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
    },
    apple: {
      issuers: APPLE_ISSUERS,
      audiences: appleAudiences,
      keys: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
    },
  } satisfies Record<SocialProvider, ProviderConfig>;
}

const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verifies signature (provider JWKS, RS256), issuer, audience and expiry. When the token carries a
 * nonce, the app must send the raw nonce: Apple tokens hold its SHA-256 (hex), Google tokens the
 * raw value. Apple sends `email_verified` as a string.
 */
export function createSocialVerifier(
  providers: Record<SocialProvider, ProviderConfig>,
): SocialVerifier {
  return async (provider, idToken, nonce) => {
    const p = providers[provider];
    if (p.audiences.length === 0) {
      throw new AppError('PROVIDER_DISABLED', `${provider} sign-in is not configured`);
    }
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, p.keys, {
        algorithms: ['RS256'],
        issuer: p.issuers,
        audience: p.audiences,
        clockTolerance: 30,
      }));
    } catch {
      throw new AppError('UNAUTHORIZED', 'Invalid identity token');
    }
    if (!payload.sub) throw new AppError('UNAUTHORIZED', 'Invalid identity token');

    if (typeof payload.nonce === 'string') {
      const expected = provider === 'apple' && nonce ? sha256Hex(nonce) : nonce;
      if (!expected || !sameString(expected, payload.nonce)) {
        throw new AppError('UNAUTHORIZED', 'Invalid identity token');
      }
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    return { provider, subject: payload.sub, email, emailVerified: Boolean(email) && verified };
  };
}
