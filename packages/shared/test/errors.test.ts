import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorSchema, errorCodes, errorStatus, isApiError, toFieldIssues } from '../src';

describe('error shape', () => {
  it('maps every code to an HTTP status', () => {
    for (const code of errorCodes) expect(errorStatus[code]).toBeGreaterThanOrEqual(400);
  });

  it('accepts a valid error and rejects unknown codes', () => {
    expect(isApiError({ error: { code: 'NOT_FOUND', message: 'x' } })).toBe(true);
    expect(isApiError({ error: { code: 'NOPE', message: 'x' } })).toBe(false);
    expect(isApiError({ message: 'x' })).toBe(false);
  });

  it('converts zod issues', () => {
    const r = z.object({ email: z.email() }).safeParse({ email: 'bad' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issues = toFieldIssues(r.error);
      expect(issues[0]?.path).toBe('email');
      expect(
        apiErrorSchema.parse({ error: { code: 'VALIDATION_FAILED', message: 'm', issues } }),
      ).toBeTruthy();
    }
  });
});
