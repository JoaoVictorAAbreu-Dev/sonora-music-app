import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  checks: z.object({ database: z.enum(['ok', 'down']) }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
