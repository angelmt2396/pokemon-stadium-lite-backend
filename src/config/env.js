import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const runningNodeTests =
  process.argv.includes('--test') ||
  process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'));

const parseClientOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173,http://localhost:4173';
const DEFAULT_POKEMON_API_BASE_URL = 'https://pokemon-api-92034153384.us-central1.run.app';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
    PORT: z.coerce
      .number()
      .int('PORT must be an integer')
      .min(1, 'PORT must be greater than 0')
      .max(65535, 'PORT must be at most 65535'),
    SHUTDOWN_TIMEOUT_MS: z.coerce
      .number()
      .int('SHUTDOWN_TIMEOUT_MS must be an integer')
      .positive('SHUTDOWN_TIMEOUT_MS must be greater than 0'),
    CLIENT_ORIGIN: z.string().trim().min(1, 'CLIENT_ORIGIN is required'),
    MONGODB_URI: z.string().trim(),
    POKEMON_API_BASE_URL: z.string().url('POKEMON_API_BASE_URL must be a valid URL'),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'test' && !value.MONGODB_URI) {
      context.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI is required',
      });
    }

    const clientOrigins = parseClientOrigins(value.CLIENT_ORIGIN);

    if (!clientOrigins.length) {
      context.addIssue({
        code: 'custom',
        path: ['CLIENT_ORIGIN'],
        message: 'CLIENT_ORIGIN must include at least one origin',
      });
      return;
    }

    for (const origin of clientOrigins) {
      try {
        new URL(origin);
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGIN'],
          message: `CLIENT_ORIGIN contains an invalid URL: ${origin}`,
        });
      }
    }
  });

const formatEnvError = (error) =>
  error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

export const parseEnv = (source, options = {}) => {
  const nodeEnv = source.NODE_ENV ?? (options.runningNodeTests ? 'test' : 'development');
  const rawEnv = {
    NODE_ENV: nodeEnv,
    LOG_LEVEL: source.LOG_LEVEL,
    PORT: source.PORT ?? '3000',
    SHUTDOWN_TIMEOUT_MS: source.SHUTDOWN_TIMEOUT_MS ?? '10000',
    CLIENT_ORIGIN: source.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGIN,
    MONGODB_URI: source.MONGODB_URI ?? '',
    POKEMON_API_BASE_URL: source.POKEMON_API_BASE_URL ?? DEFAULT_POKEMON_API_BASE_URL,
  };

  const parsedEnv = envSchema.safeParse(rawEnv);

  if (!parsedEnv.success) {
    throw new Error(`Invalid environment configuration: ${formatEnvError(parsedEnv.error)}`);
  }

  return {
    nodeEnv: parsedEnv.data.NODE_ENV,
    logLevel:
      parsedEnv.data.LOG_LEVEL ??
      (parsedEnv.data.NODE_ENV === 'test' || options.runningNodeTests ? 'silent' : 'info'),
    port: parsedEnv.data.PORT,
    shutdownTimeoutMs: parsedEnv.data.SHUTDOWN_TIMEOUT_MS,
    clientOrigins: parseClientOrigins(parsedEnv.data.CLIENT_ORIGIN),
    mongodbUri: parsedEnv.data.MONGODB_URI,
    pokemonApiBaseUrl: parsedEnv.data.POKEMON_API_BASE_URL,
  };
};

export const env = parseEnv(process.env, {
  runningNodeTests,
});
