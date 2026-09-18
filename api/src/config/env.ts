import { z } from 'zod';

/**
 * The environment the api needs, as a schema.
 *
 * Plain TypeScript on purpose: nothing here imports NestJS, so the same file can validate
 * `process.env` for an Expo API route or a one-off script. Nest plugs it in via
 * `config.module.ts`.
 *
 * Values arrive as strings (that is what environment variables are), so numbers are coerced
 * and defaults are applied here, in one place, rather than at every `process.env` read.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URI: z
    .string()
    .regex(
      /^mongodb(\+srv)?:\/\//,
      'must start with mongodb:// or mongodb+srv://',
    ),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('30d'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and return the environment, or throw one readable error naming every bad key.
 * Nest calls this during bootstrap, so a missing `DATABASE_URI` fails the process in the
 * first second with a clear message instead of a connection timeout minutes later.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;

  const lines = result.error.issues.map(
    (issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment. Fix these in api/.env (see api/.env.example):\n${lines.join('\n')}`,
  );
}
