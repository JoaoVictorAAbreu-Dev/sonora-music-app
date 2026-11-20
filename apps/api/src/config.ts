import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  /** Browser origins allowed by CORS. Native apps send no Origin; empty means no browser access. */
  CORS_ORIGINS: csv,
  APP_VERSION: z.string().default('dev'),
  /** HMAC secret for access tokens (HS256). At least 32 characters; generate with `openssl rand -base64 48`. */
  JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET must be at least 32 characters' }),
  /** Access token lifetime in seconds (default 15 minutes). */
  ACCESS_TOKEN_TTL: z.coerce.number().int().min(60).max(3600).default(900),
  /** Refresh token lifetime in seconds (default 30 days). */
  REFRESH_TOKEN_TTL: z.coerce
    .number()
    .int()
    .min(3600)
    .max(90 * 86400)
    .default(30 * 86400),
  /** Requests per IP per minute across all /auth routes. */
  AUTH_RATE_LIMIT_PER_IP: z.coerce.number().int().positive().default(30),
  /** Login/register attempts per email per 15 minutes. */
  AUTH_RATE_LIMIT_PER_EMAIL: z.coerce.number().int().positive().default(10),
  /**
   * Jamendo API client id. Only the API uses it; it never reaches the app. Empty = catalog routes
   * answer UPSTREAM_UNAVAILABLE (useful for local work without credentials).
   */
  JAMENDO_CLIENT_ID: z.string().default(''),
  JAMENDO_BASE_URL: z.url().default('https://api.jamendo.com/v3.0'),
  /** Timeout for each Jamendo request, in milliseconds. */
  JAMENDO_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5000),
  /** Catalog requests per signed-in user per minute. */
  CATALOG_RATE_LIMIT_PER_USER: z.coerce.number().int().positive().default(120),
  /** OAuth client ids whose Google ID tokens are accepted (iOS, Android, web). Empty = disabled. */
  GOOGLE_CLIENT_IDS: csv,
  /** Apple audiences accepted: the iOS bundle id (and a Services ID, if any). Empty = disabled. */
  APPLE_CLIENT_IDS: csv,
  /**
   * How reset e-mails are sent. `none` drops them (logs a warning without the address);
   * `log` writes the link to the log (local development only); `smtp` sends through SMTP_URL.
   */
  MAIL_PROVIDER: z.enum(['none', 'log', 'smtp']).default('none'),
  /** smtps://user:password@host:465 (or smtp://…:587 with STARTTLS). Secret. */
  SMTP_URL: z.string().default(''),
  /** Sender, e.g. "Sonora <nao-responda@seu-dominio>". The domain needs SPF/DKIM at the provider. */
  MAIL_FROM: z.string().default(''),
  /**
   * Base of the link in the reset e-mail. `sonora://reset-password` gets `?token=…`; an https URL
   * (the page Caddy serves at /reset-password) gets `#token=…`, which never reaches server logs.
   */
  PASSWORD_RESET_URL: z.string().default('sonora://reset-password'),
  /** Reset link lifetime in seconds (default 30 minutes). */
  PASSWORD_RESET_TTL: z.coerce.number().int().min(300).max(86400).default(1800),
  /** Number of reverse proxies in front of the API (Caddy = 1) so client IPs are correct. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    // Only names and messages — never values, which may be secrets.
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.MAIL_PROVIDER === 'log') {
    throw new Error('Invalid environment:\n  MAIL_PROVIDER: "log" is not allowed in production');
  }
  if (parsed.data.MAIL_PROVIDER === 'smtp' && (!parsed.data.SMTP_URL || !parsed.data.MAIL_FROM)) {
    throw new Error('Invalid environment:\n  MAIL_PROVIDER "smtp" needs SMTP_URL and MAIL_FROM');
  }
  return parsed.data;
}
