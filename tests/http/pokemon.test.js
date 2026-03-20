import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '../../src/shared/errors/AppError.js';
import { createApp } from '../../src/app.js';
import { startTestServer, stopTestServer } from './helpers/http-test-client.js';

const pokemonList = [
  {
    id: 25,
    name: 'Pikachu',
    sprite: 'https://example.test/pikachu.gif',
  },
  {
    id: 143,
    name: 'Snorlax',
    sprite: 'https://example.test/snorlax.gif',
  },
];

test('GET /api/v1/pokemon returns the wrapped pokemon catalog with total meta', async () => {
  const app = createApp({
    listPokemonDependency: async () => pokemonList,
    getPokemonByIdDependency: async (pokemonId) =>
      pokemonList.find((pokemon) => String(pokemon.id) === String(pokemonId)) ?? null,
  });
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/v1/pokemon`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: pokemonList,
      meta: {
        total: 2,
      },
    });
  } finally {
    await stopTestServer(server);
  }
});

test('GET /api/v1/pokemon/:id returns the wrapped pokemon detail payload', async () => {
  const app = createApp({
    listPokemonDependency: async () => pokemonList,
    getPokemonByIdDependency: async (pokemonId) => ({
      id: Number(pokemonId),
      name: 'Snorlax',
      sprite: 'https://example.test/snorlax.gif',
      type: ['Normal'],
      hp: 160,
      attack: 110,
      defense: 65,
      speed: 30,
    }),
  });
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/v1/pokemon/143`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        id: 143,
        name: 'Snorlax',
        sprite: 'https://example.test/snorlax.gif',
        type: ['Normal'],
        hp: 160,
        attack: 110,
        defense: 65,
        speed: 30,
      },
    });
  } finally {
    await stopTestServer(server);
  }
});

test('GET /api/v1/pokemon propagates AppError responses through the shared error handler', async () => {
  const app = createApp({
    listPokemonDependency: async () => {
      throw new AppError('Pokemon provider unavailable', 503, {
        provider: 'catalog',
      });
    },
    getPokemonByIdDependency: async () => null,
  });
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/v1/pokemon`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      success: false,
      message: 'Pokemon provider unavailable',
      details: {
        provider: 'catalog',
      },
    });
  } finally {
    await stopTestServer(server);
  }
});
