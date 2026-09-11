// No `server-only`: this module is also loaded by tsx scripts and Vitest.
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_FILE: z.string().min(1).default('./data/kb.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  E2E_TEST_MODE: z.coerce.number().int().min(0).max(1).default(0),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
