import dotenv from 'dotenv';

dotenv.config();

const parseClientOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigins: parseClientOrigins(
    process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:4173',
  ),
  mongodbUri: process.env.MONGODB_URI ?? '',
  pokemonApiBaseUrl:
    process.env.POKEMON_API_BASE_URL ?? 'https://pokemon-api-92034153384.us-central1.run.app',
};
