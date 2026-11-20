import { z } from 'zod';
import { isCommonPassword } from './common-passwords';

export const PASSWORD_MIN_LENGTH = 10;
/** Upper bound keeps argon2 hashing cost bounded (no multi-megabyte passwords). */
export const PASSWORD_MAX_LENGTH = 128;

/** Emails are trimmed and stored lowercase. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: 'Email is too long' })
  .pipe(z.email({ error: 'Invalid email' }));

/** Password rules for new passwords (sign-up, change). */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'too_short' })
  .max(PASSWORD_MAX_LENGTH, { error: 'too_long' })
  .refine((p) => !isCommonPassword(p), { error: 'too_common' });

/** Login accepts any non-empty password up to the max (old accounts may predate rules). */
const loginPasswordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH);

const deviceSchema = z.string().trim().min(1).max(120).optional();

export const displayNameSchema = z.string().trim().min(1).max(60);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  displayName: displayNameSchema.optional(),
  /** Sign-up requires accepting the Terms and Privacy Policy. */
  acceptTerms: z.literal(true, { error: 'terms_required' }),
  device: deviceSchema,
});
export type RegisterBody = z.input<typeof registerBodySchema>;

/** M6: sign in with Google or Apple. The API verifies the provider's ID token itself. */
export const socialProviders = ['google', 'apple'] as const;
export type SocialProvider = (typeof socialProviders)[number];

export const socialBodySchema = z.object({
  provider: z.enum(socialProviders),
  idToken: z.string().min(20).max(8192),
  /** Raw nonce the app generated for this sign-in, when the provider request used one. */
  nonce: z.string().min(16).max(256).optional(),
  /** Apple sends the name only on the first sign-in, outside the token. */
  displayName: displayNameSchema.optional(),
  /** Required only when this creates a new account. */
  acceptTerms: z.boolean().optional(),
  device: deviceSchema,
});
export type SocialBody = z.input<typeof socialBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  device: deviceSchema,
});
export type LoginBody = z.input<typeof loginBodySchema>;

const opaqueTokenSchema = z.string().min(32).max(256);

export const refreshBodySchema = z.object({ refreshToken: opaqueTokenSchema });

/** T04: request a reset link. The API answers 202 whether or not the e-mail exists. */
export const forgotPasswordBodySchema = z.object({ email: emailSchema });
export type ForgotPasswordBody = z.input<typeof forgotPasswordBodySchema>;

/** Sets a new password with the one-time token from the e-mailed link. */
export const resetPasswordBodySchema = z.object({
  token: opaqueTokenSchema,
  password: newPasswordSchema,
});
export type ResetPasswordBody = z.input<typeof resetPasswordBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;

export const logoutBodySchema = refreshBodySchema;
export type LogoutBody = RefreshBody;

export const updateMeBodySchema = z
  .object({ displayName: displayNameSchema.nullable().optional() })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { error: 'empty_update' });
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type User = z.infer<typeof userSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  /** ISO timestamp; the client refreshes shortly before it. */
  accessTokenExpiresAt: z.iso.datetime({ offset: true }),
  refreshToken: z.string().min(32),
  refreshTokenExpiresAt: z.iso.datetime({ offset: true }),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export const authResponseSchema = z.object({ user: userSchema, tokens: tokenPairSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshResponseSchema = z.object({ tokens: tokenPairSchema });
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = z.object({ user: userSchema });
export type MeResponse = z.infer<typeof meResponseSchema>;
