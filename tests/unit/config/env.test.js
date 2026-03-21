import test from 'node:test';
import assert from 'node:assert/strict';

import { parseEnv } from '../../../src/config/env.js';

test('parseEnv defaults NODE_ENV to test and LOG_LEVEL to silent when running node tests', () => {
  const env = parseEnv(
    {
      MONGODB_URI: '',
    },
    {
      runningNodeTests: true,
    },
  );

  assert.equal(env.nodeEnv, 'test');
  assert.equal(env.logLevel, 'silent');
  assert.deepEqual(env.clientOrigins, ['http://localhost:5173', 'http://localhost:4173']);
});

test('parseEnv rejects missing MONGODB_URI outside test mode', () => {
  assert.throws(
    () =>
      parseEnv(
        {
          NODE_ENV: 'production',
          CLIENT_ORIGIN: 'https://example.com',
          POKEMON_API_BASE_URL: 'https://pokemon.example.com',
        },
        {
          runningNodeTests: false,
        },
      ),
    /MONGODB_URI: MONGODB_URI is required/,
  );
});

test('parseEnv rejects invalid CLIENT_ORIGIN entries', () => {
  assert.throws(
    () =>
      parseEnv(
        {
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/pokemon-stadium-lite',
          CLIENT_ORIGIN: 'not-a-url',
          POKEMON_API_BASE_URL: 'https://pokemon.example.com',
        },
        {
          runningNodeTests: false,
        },
      ),
    /CLIENT_ORIGIN: CLIENT_ORIGIN contains an invalid URL: not-a-url/,
  );
});
