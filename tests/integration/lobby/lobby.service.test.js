import test from 'node:test';
import assert from 'node:assert/strict';

import { BATTLE_STATUS } from '../../../src/shared/constants/battle-status.js';
import { LOBBY_STATUS } from '../../../src/shared/constants/lobby-status.js';
import { createBattleService, normalizeBattleStatePayload } from '../../../src/modules/battle/services/battle.service.js';
import { createLobbyService } from '../../../src/modules/lobby/services/lobby.service.js';
import {
  createInMemoryBattleDependencies,
  createInMemoryLobbyDependencies,
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../helpers/in-memory-state.js';

const pokemonCatalogById = {
  1: { id: 1, name: 'Bulbasaur', hp: 45, attack: 49, defense: 49, speed: 45 },
  4: { id: 4, name: 'Charmander', hp: 39, attack: 52, defense: 43, speed: 65 },
  7: { id: 7, name: 'Squirtle', hp: 44, attack: 48, defense: 65, speed: 43 },
  25: { id: 25, name: 'Pikachu', hp: 35, attack: 55, defense: 40, speed: 90 },
  39: { id: 39, name: 'Jigglypuff', hp: 115, attack: 45, defense: 20, speed: 20 },
  143: { id: 143, name: 'Snorlax', hp: 160, attack: 110, defense: 65, speed: 30 },
};

const createServices = () => {
  const state = createInMemoryState();
  const lobbyDependencies = createInMemoryLobbyDependencies(state);
  const playerDependencies = createInMemoryPlayerDependencies(state);
  const battleDependencies = createInMemoryBattleDependencies(state);

  const battleService = createBattleService({
    runSerializedDependency: runImmediate,
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    createBattleDependency: battleDependencies.createBattle,
    findBattleByIdDependency: battleDependencies.findBattleById,
    findBattleByLobbyIdDependency: battleDependencies.findBattleByLobbyId,
    saveBattleDependency: battleDependencies.saveBattle,
    getPokemonByIdDependency: async (pokemonId) => pokemonCatalogById[pokemonId],
  });

  const lobbyService = createLobbyService({
    runSerializedDependency: runImmediate,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    updatePlayerSocketDependency: playerDependencies.updatePlayerSocket,
    registerPlayerDependency: playerDependencies.registerPlayer,
    createLobbyDependency: lobbyDependencies.createLobby,
    findCurrentLobbyDependency: lobbyDependencies.findCurrentLobby,
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    findLobbyByPlayerIdDependency: lobbyDependencies.findLobbyByPlayerId,
    findWaitingLobbyDependency: lobbyDependencies.findWaitingLobby,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    findBattleByLobbyIdDependency: battleDependencies.findBattleByLobbyId,
    normalizeBattleStatePayloadDependency: normalizeBattleStatePayload,
    startBattleDependency: battleService.startBattle,
  });

  return {
    state,
    lobbyService,
    battleService,
  };
};

const assignTeamsToCurrentLobby = (state) => {
  const lobby = state.lobbies[0];

  lobby.players[0].team = [
    { pokemonId: 25, name: 'Pikachu' },
    { pokemonId: 4, name: 'Charmander' },
    { pokemonId: 7, name: 'Squirtle' },
  ];
  lobby.players[1].team = [
    { pokemonId: 143, name: 'Snorlax' },
    { pokemonId: 39, name: 'Jigglypuff' },
    { pokemonId: 1, name: 'Bulbasaur' },
  ];

  return lobby;
};

test('joinLobby creates a waiting lobby and registers the first player', async () => {
  const { state, lobbyService } = createServices();

  const result = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });

  assert.equal(result.status, LOBBY_STATUS.WAITING);
  assert.equal(state.players.length, 1);
  assert.equal(state.lobbies.length, 1);
  assert.equal(result.lobbyStatus.players.length, 1);
  assert.equal(result.lobbyStatus.players[0].nickname, 'Ash');
});

test('joinLobby rejects duplicated nicknames in the same active lobby', async () => {
  const { lobbyService } = createServices();

  await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });

  await assert.rejects(
    () =>
      lobbyService.joinLobby({
        nickname: 'ash',
        socketId: 'socket-other',
      }),
    {
      message: 'Nickname is already taken in the current lobby',
    },
  );
});

test('markPlayerReady starts a battle when both players are ready', async () => {
  const { state, lobbyService } = createServices();

  const ash = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });
  const misty = await lobbyService.joinLobby({
    nickname: 'Misty',
    socketId: 'socket-misty',
  });

  assignTeamsToCurrentLobby(state);

  const firstReady = await lobbyService.markPlayerReady({
    lobbyId: ash.lobbyId,
    playerId: ash.playerId,
  });

  assert.equal(firstReady.ready, true);
  assert.equal(firstReady.battleStart, undefined);

  const secondReady = await lobbyService.markPlayerReady({
    lobbyId: misty.lobbyId,
    playerId: misty.playerId,
  });

  assert.equal(secondReady.ready, true);
  assert.equal(secondReady.lobbyStatus.status, LOBBY_STATUS.READY);
  assert.equal(secondReady.battleStart.status, BATTLE_STATUS.BATTLING);
  assert.equal(secondReady.battleStart.currentTurnPlayerId, ash.playerId);
  assert.equal(state.battles.length, 1);
  assert.equal(state.lobbies[0].status, LOBBY_STATUS.BATTLING);
});

test('markPlayerReady is idempotent and returns the active battle snapshot', async () => {
  const { state, lobbyService } = createServices();

  const ash = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });
  const misty = await lobbyService.joinLobby({
    nickname: 'Misty',
    socketId: 'socket-misty',
  });

  assignTeamsToCurrentLobby(state);

  await lobbyService.markPlayerReady({
    lobbyId: ash.lobbyId,
    playerId: ash.playerId,
  });

  await lobbyService.markPlayerReady({
    lobbyId: misty.lobbyId,
    playerId: misty.playerId,
  });

  const repeatedReady = await lobbyService.markPlayerReady({
    lobbyId: ash.lobbyId,
    playerId: ash.playerId,
  });

  assert.equal(repeatedReady.ready, true);
  assert.equal(repeatedReady.battleStart.status, BATTLE_STATUS.BATTLING);
  assert.equal(repeatedReady.battleStart.battleId, state.battles[0].id);
});

test('reconnectPlayer updates the socket and returns lobby state while the lobby is still waiting', async () => {
  const { state, lobbyService } = createServices();

  const ash = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });

  const result = await lobbyService.reconnectPlayer({
    playerId: ash.playerId,
    socketId: 'socket-ash-new',
  });

  assert.equal(result.playerId, ash.playerId);
  assert.equal(result.previousSocketId, 'socket-ash');
  assert.equal(result.lobbyStatus.status, LOBBY_STATUS.WAITING);
  assert.equal(result.battleState, null);
  assert.equal(state.players[0].socketId, 'socket-ash-new');
});

test('reconnectPlayer returns the active battle snapshot when a battle is in progress', async () => {
  const { state, lobbyService } = createServices();

  const ash = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });
  const misty = await lobbyService.joinLobby({
    nickname: 'Misty',
    socketId: 'socket-misty',
  });

  assignTeamsToCurrentLobby(state);

  await lobbyService.markPlayerReady({
    lobbyId: ash.lobbyId,
    playerId: ash.playerId,
  });

  await lobbyService.markPlayerReady({
    lobbyId: misty.lobbyId,
    playerId: misty.playerId,
  });

  const result = await lobbyService.reconnectPlayer({
    playerId: ash.playerId,
    socketId: 'socket-ash-reconnected',
  });

  assert.equal(result.previousSocketId, 'socket-ash');
  assert.equal(result.lobbyStatus.status, LOBBY_STATUS.BATTLING);
  assert.equal(result.battleState.status, BATTLE_STATUS.BATTLING);
  assert.equal(result.battleState.battleId, state.battles[0].id);
  assert.equal(result.battleState.currentTurnPlayerId, ash.playerId);
});

test('reconnectPlayer returns the finished battle snapshot when the battle already ended', async () => {
  const { state, lobbyService } = createServices();

  const ash = await lobbyService.joinLobby({
    nickname: 'Ash',
    socketId: 'socket-ash',
  });
  const misty = await lobbyService.joinLobby({
    nickname: 'Misty',
    socketId: 'socket-misty',
  });

  assignTeamsToCurrentLobby(state);

  await lobbyService.markPlayerReady({
    lobbyId: ash.lobbyId,
    playerId: ash.playerId,
  });

  await lobbyService.markPlayerReady({
    lobbyId: misty.lobbyId,
    playerId: misty.playerId,
  });

  state.battles[0].status = BATTLE_STATUS.FINISHED;
  state.battles[0].currentTurnPlayerId = null;
  state.lobbies[0].status = LOBBY_STATUS.FINISHED;

  const result = await lobbyService.reconnectPlayer({
    playerId: misty.playerId,
    socketId: 'socket-misty-reconnected',
  });

  assert.equal(result.lobbyStatus.status, LOBBY_STATUS.FINISHED);
  assert.equal(result.battleState.status, BATTLE_STATUS.FINISHED);
  assert.equal(result.battleState.currentTurnPlayerId, null);
});
