import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlayerSessionService } from '../../../src/modules/players/services/player-session.service.js';
import {
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../helpers/in-memory-state.js';

const createService = () => {
  const state = createInMemoryState();
  const playerDependencies = createInMemoryPlayerDependencies(state);

  const service = createPlayerSessionService({
    runSerializedDependency: runImmediate,
    createPlayerDependency: playerDependencies.createPlayer,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    findPlayerByNicknameNormalizedDependency: playerDependencies.findPlayerByNicknameNormalized,
    findPlayerBySessionTokenHashDependency: playerDependencies.findPlayerBySessionTokenHash,
    updatePlayerStateDependency: playerDependencies.updatePlayerState,
  });

  return {
    state,
    service,
  };
};

test('createOrRefreshSession creates a new active player session', async () => {
  const { state, service } = createService();

  const session = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  assert.equal(state.players.length, 1);
  assert.equal(session.nickname, 'Ash');
  assert.equal(session.sessionStatus, 'active');
  assert.equal(typeof session.sessionToken, 'string');
  assert.equal(session.sessionToken.length > 0, true);
  assert.equal(typeof session.reconnectToken, 'string');
  assert.equal(state.players[0].nicknameNormalized, 'ash');
});

test('createOrRefreshSession rejects nicknames that already have an active session', async () => {
  const { service } = createService();

  await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  await assert.rejects(
    () =>
      service.createOrRefreshSession({
        nickname: 'ash',
      }),
    {
      message: 'Nickname is already in use',
    },
  );
});

test('createOrRefreshSession reclaims a disconnected active session for the same nickname', async () => {
  const { service, state } = createService();

  const session = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  state.players[0].status = 'battling';
  state.players[0].activeBattleId = 'battle-1';
  state.players[0].activeLobbyId = 'lobby-1';
  state.players[0].disconnectedAt = new Date();

  const reclaimedSession = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  assert.equal(reclaimedSession.playerId, session.playerId);
  assert.equal(reclaimedSession.currentBattleId, 'battle-1');
  assert.equal(reclaimedSession.currentLobbyId, 'lobby-1');
  assert.notEqual(reclaimedSession.sessionToken, session.sessionToken);
  assert.notEqual(reclaimedSession.reconnectToken, session.reconnectToken);
});

test('authenticatePlayerSession resolves the active player from the bearer token', async () => {
  const { service } = createService();

  const session = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  const player = await service.authenticatePlayerSession({
    sessionToken: session.sessionToken,
  });

  assert.equal(String(player.id), session.playerId);
  assert.equal(player.nickname, 'Ash');
});

test('closePlayerSession invalidates the token and allows logging in again', async () => {
  const { service } = createService();

  const session = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  await service.closePlayerSession({
    playerId: session.playerId,
  });

  await assert.rejects(
    () =>
      service.authenticatePlayerSession({
        sessionToken: session.sessionToken,
      }),
    {
      message: 'Invalid or expired session token',
    },
  );

  const reopenedSession = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  assert.equal(reopenedSession.playerId, session.playerId);
  assert.equal(reopenedSession.sessionStatus, 'active');
});

test('markPlayerDisconnected marks the active session as reclaimable for the same nickname', async () => {
  const { service } = createService();

  const session = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  await service.bindPlayerSocket({
    playerId: session.playerId,
    socketId: 'socket-1',
  });

  await service.markPlayerDisconnected({
    playerId: session.playerId,
    socketId: 'socket-1',
  });

  const reclaimedSession = await service.createOrRefreshSession({
    nickname: 'Ash',
  });

  assert.equal(reclaimedSession.playerId, session.playerId);
  assert.notEqual(reclaimedSession.sessionToken, session.sessionToken);
  assert.notEqual(reclaimedSession.reconnectToken, session.reconnectToken);
});
