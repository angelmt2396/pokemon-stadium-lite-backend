import test from 'node:test';
import assert from 'node:assert/strict';

import { BATTLE_STATUS } from '../../src/shared/constants/battle-status.js';
import { SOCKET_EVENTS } from '../../src/shared/constants/socket-events.js';
import { createSocketHarness, emitWithAck, onceEvent } from './helpers/socket-test-harness.js';

const setupBattleSession = async (harness) => {
  const ash = await harness.connectClient();
  const misty = await harness.connectClient();

  const ashLobbyStatus = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
  const ashJoinAck = await emitWithAck(ash, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, {
    nickname: 'Ash',
  });
  await ashLobbyStatus;

  const mistyJoinAckPromise = emitWithAck(misty, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, {
    nickname: 'Misty',
  });
  await Promise.all([
    onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    mistyJoinAckPromise,
  ]);
  const mistyJoinAck = await mistyJoinAckPromise;

  await Promise.all([
    onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    emitWithAck(ash, SOCKET_EVENTS.CLIENT.ASSIGN_POKEMON, {
      lobbyId: ashJoinAck.data.lobbyId,
      playerId: ashJoinAck.data.playerId,
    }),
  ]);

  await Promise.all([
    onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    emitWithAck(ash, SOCKET_EVENTS.CLIENT.READY, {
      lobbyId: ashJoinAck.data.lobbyId,
      playerId: ashJoinAck.data.playerId,
    }),
  ]);

  const ashBattleStart = onceEvent(ash, SOCKET_EVENTS.SERVER.BATTLE_START);
  const mistyBattleStart = onceEvent(misty, SOCKET_EVENTS.SERVER.BATTLE_START);
  await Promise.all([
    onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
    ashBattleStart,
    mistyBattleStart,
    emitWithAck(misty, SOCKET_EVENTS.CLIENT.READY, {
      lobbyId: mistyJoinAck.data.lobbyId,
      playerId: mistyJoinAck.data.playerId,
    }),
  ]);

  const battleState = await ashBattleStart;

  return {
    ash,
    misty,
    ashJoinAck,
    mistyJoinAck,
    battleState,
  };
};

test('socket flow covers join, assign, ready and attack with real clients', async () => {
  const harness = await createSocketHarness();
  const ash = await harness.connectClient();
  const misty = await harness.connectClient();

  try {
    const ashLobbyStatus = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const ashJoinAck = await emitWithAck(ash, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, {
      nickname: 'Ash',
    });
    const ashLobbyPayload = await ashLobbyStatus;

    assert.equal(ashJoinAck.ok, true);
    assert.equal(ashJoinAck.data.playerId, ashJoinAck.data.lobbyStatus.players[0].playerId);
    assert.equal(ashLobbyPayload.players.length, 1);

    const ashLobbyUpdate = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const mistyLobbyUpdate = onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const mistyJoinAck = await emitWithAck(misty, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, {
      nickname: 'Misty',
    });
    const [ashAfterMisty, mistyAfterJoin] = await Promise.all([ashLobbyUpdate, mistyLobbyUpdate]);

    assert.equal(mistyJoinAck.ok, true);
    assert.equal(ashAfterMisty.players.length, 2);
    assert.equal(mistyAfterJoin.players.length, 2);

    const ashAssignedLobby = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const mistyAssignedLobby = onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const assignAck = await emitWithAck(ash, SOCKET_EVENTS.CLIENT.ASSIGN_POKEMON, {
      lobbyId: ashJoinAck.data.lobbyId,
      playerId: ashJoinAck.data.playerId,
    });
    const [ashAssignedStatus, mistyAssignedStatus] = await Promise.all([ashAssignedLobby, mistyAssignedLobby]);

    assert.equal(assignAck.ok, true);
    assert.equal(assignAck.data.team.length, 3);
    assert.equal(ashAssignedStatus.players[0].team.length, 3);
    assert.equal(mistyAssignedStatus.players[1].team.length, 3);

    const ashReadyLobby = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const mistyReadyLobby = onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const ashReadyAck = await emitWithAck(ash, SOCKET_EVENTS.CLIENT.READY, {
      lobbyId: ashJoinAck.data.lobbyId,
      playerId: ashJoinAck.data.playerId,
    });
    const [ashReadyStatus, mistyReadyStatus] = await Promise.all([ashReadyLobby, mistyReadyLobby]);

    assert.equal(ashReadyAck.ok, true);
    assert.equal(ashReadyStatus.players[0].ready, true);
    assert.equal(mistyReadyStatus.players[1].ready, false);

    const ashLobbyReady = onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const mistyLobbyReady = onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
    const ashBattleStart = onceEvent(ash, SOCKET_EVENTS.SERVER.BATTLE_START);
    const mistyBattleStart = onceEvent(misty, SOCKET_EVENTS.SERVER.BATTLE_START);
    const mistyReadyAck = await emitWithAck(misty, SOCKET_EVENTS.CLIENT.READY, {
      lobbyId: mistyJoinAck.data.lobbyId,
      playerId: mistyJoinAck.data.playerId,
    });
    const [ashReadyBroadcast, mistyReadyBroadcast, ashBattlePayload, mistyBattlePayload] = await Promise.all([
      ashLobbyReady,
      mistyLobbyReady,
      ashBattleStart,
      mistyBattleStart,
    ]);

    assert.equal(mistyReadyAck.ok, true);
    assert.equal(ashReadyBroadcast.status, 'ready');
    assert.equal(mistyReadyBroadcast.status, 'ready');
    assert.equal(ashBattlePayload.status, BATTLE_STATUS.BATTLING);
    assert.equal(ashBattlePayload.battleId, mistyBattlePayload.battleId);

    const attackPlayerId = ashBattlePayload.currentTurnPlayerId;
    const attackerSocket = attackPlayerId === ashJoinAck.data.playerId ? ash : misty;

    const ashTurnResult = onceEvent(ash, SOCKET_EVENTS.SERVER.TURN_RESULT);
    const mistyTurnResult = onceEvent(misty, SOCKET_EVENTS.SERVER.TURN_RESULT);
    const attackAck = await emitWithAck(attackerSocket, SOCKET_EVENTS.CLIENT.ATTACK, {
      battleId: ashBattlePayload.battleId,
      playerId: attackPlayerId,
    });
    const [ashTurnPayload, mistyTurnPayload] = await Promise.all([ashTurnResult, mistyTurnResult]);

    assert.equal(attackAck.ok, true);
    assert.equal(attackAck.data.accepted, true);
    assert.equal(ashTurnPayload.battleId, ashBattlePayload.battleId);
    assert.equal(mistyTurnPayload.battleId, ashBattlePayload.battleId);
    assert.equal(ashTurnPayload.nextTurnPlayerId, mistyTurnPayload.nextTurnPlayerId);
  } finally {
    await harness.close();
  }
});

test('socket flow supports reconnect_player with a real client during battle', async () => {
  const harness = await createSocketHarness();

  try {
    const { ash, misty, battleState } = await setupBattleSession(harness);
    const reconnectingPlayerId = battleState.currentTurnPlayerId;
    const reconnectingSocket = reconnectingPlayerId === harness.state.players[0].id ? ash : misty;

    reconnectingSocket.disconnect();

    const reconnectedClient = await harness.connectClient();

    try {
      const lobbyStatusAfterReconnect = onceEvent(reconnectedClient, SOCKET_EVENTS.SERVER.LOBBY_STATUS);
      const battleStartAfterReconnect = onceEvent(reconnectedClient, SOCKET_EVENTS.SERVER.BATTLE_START);
      const reconnectAck = await emitWithAck(reconnectedClient, SOCKET_EVENTS.CLIENT.RECONNECT_PLAYER, {
        playerId: reconnectingPlayerId,
      });
      const [reconnectedLobbyStatus, reconnectedBattleState] = await Promise.all([
        lobbyStatusAfterReconnect,
        battleStartAfterReconnect,
      ]);

      assert.equal(reconnectAck.ok, true);
      assert.equal(reconnectAck.data.playerId, reconnectingPlayerId);
      assert.equal(reconnectAck.data.battleState.battleId, battleState.battleId);
      assert.equal(reconnectedLobbyStatus.status, 'battling');
      assert.equal(reconnectedBattleState.battleId, battleState.battleId);

      const otherSocket = reconnectingPlayerId === harness.state.players[0].id ? misty : ash;
      const reconnectTurnResult = onceEvent(reconnectedClient, SOCKET_EVENTS.SERVER.TURN_RESULT);
      const otherTurnResult = onceEvent(otherSocket, SOCKET_EVENTS.SERVER.TURN_RESULT);
      const attackAck = await emitWithAck(reconnectedClient, SOCKET_EVENTS.CLIENT.ATTACK, {
        battleId: battleState.battleId,
        playerId: reconnectingPlayerId,
      });
      const [reconnectedTurnPayload, otherTurnPayload] = await Promise.all([
        reconnectTurnResult,
        otherTurnResult,
      ]);

      assert.equal(attackAck.ok, true);
      assert.equal(attackAck.data.accepted, true);
      assert.equal(reconnectedTurnPayload.battleId, battleState.battleId);
      assert.equal(otherTurnPayload.battleId, battleState.battleId);
    } finally {
      reconnectedClient.disconnect();
    }
  } finally {
    await harness.close();
  }
});

test('socket flow rejects a third join_lobby request while the single waiting lobby is full', async () => {
  const harness = await createSocketHarness();

  try {
    const ash = await harness.connectClient();
    const misty = await harness.connectClient();
    const brock = await harness.connectClient();

    await Promise.all([
      onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
      emitWithAck(ash, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, { nickname: 'Ash' }),
    ]);

    await Promise.all([
      onceEvent(ash, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
      onceEvent(misty, SOCKET_EVENTS.SERVER.LOBBY_STATUS),
      emitWithAck(misty, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, { nickname: 'Misty' }),
    ]);

    const thirdJoinAck = await emitWithAck(brock, SOCKET_EVENTS.CLIENT.JOIN_LOBBY, {
      nickname: 'Brock',
    });

    assert.equal(thirdJoinAck.ok, false);
    assert.equal(thirdJoinAck.message, 'Lobby is full');
  } finally {
    await harness.close();
  }
});

test('socket flow rejects attack events when the player attacks out of turn', async () => {
  const harness = await createSocketHarness();

  try {
    const { ash, misty, ashJoinAck, mistyJoinAck, battleState } = await setupBattleSession(harness);
    const wrongPlayerId =
      battleState.currentTurnPlayerId === ashJoinAck.data.playerId
        ? mistyJoinAck.data.playerId
        : ashJoinAck.data.playerId;
    const wrongSocket = wrongPlayerId === ashJoinAck.data.playerId ? ash : misty;

    const attackAck = await emitWithAck(wrongSocket, SOCKET_EVENTS.CLIENT.ATTACK, {
      battleId: battleState.battleId,
      playerId: wrongPlayerId,
    });

    assert.equal(attackAck.ok, false);
    assert.equal(attackAck.message, 'Player cannot attack out of turn');
  } finally {
    await harness.close();
  }
});

test('socket flow rejects reconnect_player when the player id is invalid', async () => {
  const harness = await createSocketHarness();

  try {
    const client = await harness.connectClient();

    const reconnectAck = await emitWithAck(client, SOCKET_EVENTS.CLIENT.RECONNECT_PLAYER, {
      playerId: 'player-does-not-exist',
    });

    assert.equal(reconnectAck.ok, false);
    assert.equal(reconnectAck.message, 'Player not found');
  } finally {
    await harness.close();
  }
});
