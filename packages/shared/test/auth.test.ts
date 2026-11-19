import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  newPasswordSchema,
  registerBodySchema,
  updateMeBodySchema,
  PASSWORD_MIN_LENGTH,
} from '../src';

describe('emailSchema', () => {
  it('trims and lowercases', () =>
    expect(emailSchema.parse('  Ana@Example.COM ')).toBe('ana@example.com'));
  it('rejects invalid emails', () => expect(emailSchema.safeParse('ana@').success).toBe(false));
});

describe('newPasswordSchema', () => {
  const issue = (p: string) => newPasswordSchema.safeParse(p).error?.issues[0]?.message;

  it(`requires at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(issue('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('too_short');
    expect(newPasswordSchema.safeParse('correct horse').success).toBe(true);
  });
  it('rejects very common passwords case-insensitively', () => {
    expect(issue('Password123')).toBe('too_common');
    expect(issue('1234567890')).toBe('too_common');
  });
  it('caps the length', () => expect(issue('x'.repeat(129))).toBe('too_long'));
});

describe('registerBodySchema', () => {
  const base = { email: 'a@b.co', password: 'correct horse battery' };
  it('requires accepting the terms', () => {
    expect(registerBodySchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(registerBodySchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
  });
});

describe('updateMeBodySchema', () => {
  it('rejects empty and unknown fields', () => {
    expect(updateMeBodySchema.safeParse({}).success).toBe(false);
    expect(updateMeBodySchema.safeParse({ email: 'x@y.z' }).success).toBe(false);
    expect(updateMeBodySchema.safeParse({ displayName: 'Ana' }).success).toBe(true);
    expect(updateMeBodySchema.safeParse({ displayName: null }).success).toBe(true);
  });
});
