import dotenv from 'dotenv';

dotenv.config();

const runningNodeTests =
  process.argv.includes('--test') ||
  process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'));

const parseClientOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' || runningNodeTests ? 'silent' : 'info'),
  port: Number(process.env.PORT ?? 3000),
  clientOrigins: parseClientOrigins(
    process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:4173',
  ),
  mongodbUri: process.env.MONGODB_URI ?? '',
  pokemonApiBaseUrl:
    process.env.POKEMON_API_BASE_URL ?? 'https://pokemon-api-92034153384.us-central1.run.app',
};
