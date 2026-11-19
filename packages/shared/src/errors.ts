import { z } from 'zod';

/** Every API error uses this code set. Clients branch on `code`, never on `message`. */
export const errorCodes = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export const errorStatus: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 502,
  INTERNAL: 500,
};

export const fieldIssueSchema = z.object({ path: z.string(), message: z.string() });

/** The one error shape returned by every API route. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
    requestId: z.string().optional(),
    issues: z.array(fieldIssueSchema).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type FieldIssue = z.infer<typeof fieldIssueSchema>;

export function isApiError(value: unknown): value is ApiError {
  return apiErrorSchema.safeParse(value).success;
}

/** Converts Zod issues into the public `issues` array. */
export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}
