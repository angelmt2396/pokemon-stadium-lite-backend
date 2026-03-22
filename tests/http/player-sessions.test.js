import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../src/app.js';
import { createPlayerSessionService } from '../../src/modules/players/services/player-session.service.js';
import {
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../integration/helpers/in-memory-state.js';
import { startTestServer, stopTestServer } from './helpers/http-test-client.js';

const createSessionApp = () => {
  const state = createInMemoryState();
  const playerDependencies = createInMemoryPlayerDependencies(state);
  const playerSessionService = createPlayerSessionService({
    runSerializedDependency: runImmediate,
    createPlayerDependency: playerDependencies.createPlayer,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    findPlayerByNicknameNormalizedDependency: playerDependencies.findPlayerByNicknameNormalized,
    findPlayerBySessionTokenHashDependency: playerDependencies.findPlayerBySessionTokenHash,
    updatePlayerStateDependency: playerDependencies.updatePlayerState,
  });

  const app = createApp({
    createOrRefreshSessionDependency: playerSessionService.createOrRefreshSession,
    getPlayerSessionDependency: playerSessionService.getPlayerSession,
    closePlayerSessionDependency: playerSessionService.closePlayerSession,
    authenticatePlayerSessionDependency: playerSessionService.authenticatePlayerSession,
  });

  return {
    app,
    state,
  };
};

test('POST /api/v1/player-sessions creates a lightweight session and returns the token', async () => {
  const { app } = createSessionApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/v1/player-sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        nickname: 'Ash',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.nickname, 'Ash');
    assert.equal(body.data.sessionStatus, 'active');
    assert.equal(typeof body.data.sessionToken, 'string');
  } finally {
    await stopTestServer(server);
  }
});

test('GET /api/v1/player-sessions/me restores the authenticated session', async () => {
  const { app } = createSessionApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const createResponse = await fetch(`${baseUrl}/api/v1/player-sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        nickname: 'Ash',
      }),
    });
    const createdSession = await createResponse.json();

    const response = await fetch(`${baseUrl}/api/v1/player-sessions/me`, {
      headers: {
        authorization: `Bearer ${createdSession.data.sessionToken}`,
      },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        playerId: createdSession.data.playerId,
        nickname: 'Ash',
        sessionStatus: 'active',
        playerStatus: 'idle',
        currentLobbyId: null,
        currentBattleId: null,
      },
    });
  } finally {
    await stopTestServer(server);
  }
});

test('DELETE /api/v1/player-sessions/me closes the authenticated session', async () => {
  const { app } = createSessionApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const createResponse = await fetch(`${baseUrl}/api/v1/player-sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        nickname: 'Ash',
      }),
    });
    const createdSession = await createResponse.json();

    const deleteResponse = await fetch(`${baseUrl}/api/v1/player-sessions/me`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${createdSession.data.sessionToken}`,
      },
    });
    const deleteBody = await deleteResponse.json();

    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(deleteBody, {
      success: true,
      data: {
        closed: true,
      },
    });

    const meResponse = await fetch(`${baseUrl}/api/v1/player-sessions/me`, {
      headers: {
        authorization: `Bearer ${createdSession.data.sessionToken}`,
      },
    });
    const meBody = await meResponse.json();

    assert.equal(meResponse.status, 401);
    assert.deepEqual(meBody, {
      success: false,
      message: 'Invalid or expired session token',
    });
  } finally {
    await stopTestServer(server);
  }
});

test('GET /api/v1/player-sessions/me rejects requests without bearer auth', async () => {
  const { app } = createSessionApp();
  const { server, baseUrl } = await startTestServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/v1/player-sessions/me`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      success: false,
      message: 'Authorization header is required',
    });
  } finally {
    await stopTestServer(server);
  }
});
