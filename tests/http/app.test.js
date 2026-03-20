import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../src/app.js';
import { startTestServer, stopTestServer } from './helpers/http-test-client.js';

test('GET /health returns the backend health payload', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        status: 'ok',
        service: 'pokemon-stadium-lite-backend',
      },
    });
  } finally {
    await stopTestServer(server);
  }
});

test('unknown routes return the standard 404 envelope', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      success: false,
      message: 'Route not found',
    });
  } finally {
    await stopTestServer(server);
  }
});
