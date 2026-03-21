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

test('GET /docs/openapi.json exposes the OpenAPI document', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/docs/openapi.json`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.openapi, '3.1.0');
    assert.ok(body.paths['/health']);
    assert.ok(body.paths['/api/v1/pokemon']);
    assert.ok(body.paths['/api/v1/pokemon/{id}']);
  } finally {
    await stopTestServer(server);
  }
});

test('GET /docs returns Swagger UI', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/docs/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /<div id="swagger-ui"><\/div>/i);
    assert.match(body, /Pokemon Stadium Lite Backend Docs/i);
  } finally {
    await stopTestServer(server);
  }
});

test('GET /documentation returns the consolidated HTML documentation page', async () => {
  const app = createApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/documentation`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Pokemon Stadium Lite Backend Documentation/i);
    assert.match(body, /\/docs\/openapi\.json/i);
    assert.match(body, /Socket\.IO Contracts/i);
    assert.match(body, /search_match/i);
    assert.match(body, /Try It/i);
    assert.match(body, /REST Request Tester/i);
    assert.match(body, /Socket\.IO Event Tester/i);
  } finally {
    await stopTestServer(server);
  }
});
