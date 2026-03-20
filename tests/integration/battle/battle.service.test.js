import test from 'node:test';
import assert from 'node:assert/strict';

import { BATTLE_STATUS } from '../../../src/shared/constants/battle-status.js';
import { LOBBY_STATUS } from '../../../src/shared/constants/lobby-status.js';
import { createBattleService } from '../../../src/modules/battle/services/battle.service.js';
import {
  createInMemoryBattleDependencies,
  createInMemoryLobbyDependencies,
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../helpers/in-memory-state.js';

const pokemonCatalogById = {
  25: { id: 25, name: 'Pikachu', hp: 35, attack: 55, defense: 40, speed: 90 },
  143: { id: 143, name: 'Snorlax', hp: 160, attack: 110, defense: 65, speed: 30 },
  4: { id: 4, name: 'Charmander', hp: 39, attack: 52, defense: 43, speed: 65 },
  7: { id: 7, name: 'Squirtle', hp: 44, attack: 48, defense: 65, speed: 43 },
};

const createService = () => {
  const state = createInMemoryState();
  const lobbyDependencies = createInMemoryLobbyDependencies(state);
  const battleDependencies = createInMemoryBattleDependencies(state);
  const playerDependencies = createInMemoryPlayerDependencies(state);

  state.players.push(
    {
      id: 'player-ash',
      nickname: 'Ash',
      socketId: 'socket-ash',
      status: 'in_lobby',
      activeLobbyId: 'lobby-1',
    },
    {
      id: 'player-misty',
      nickname: 'Misty',
      socketId: 'socket-misty',
      status: 'in_lobby',
      activeLobbyId: 'lobby-1',
    },
  );

  const lobby = {
    id: 'lobby-1',
    status: LOBBY_STATUS.READY,
    players: [
      {
        playerId: 'player-ash',
        nickname: 'Ash',
        ready: true,
        team: [
          { pokemonId: 25, name: 'Pikachu' },
          { pokemonId: 4, name: 'Charmander' },
          { pokemonId: 7, name: 'Squirtle' },
        ],
      },
      {
        playerId: 'player-misty',
        nickname: 'Misty',
        ready: true,
        team: [
          { pokemonId: 143, name: 'Snorlax' },
          { pokemonId: 4, name: 'Charmander' },
          { pokemonId: 7, name: 'Squirtle' },
        ],
      },
    ],
  };

  state.lobbies.push(lobby);

  const service = createBattleService({
    runSerializedDependency: runImmediate,
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    createBattleDependency: battleDependencies.createBattle,
    findBattleByIdDependency: battleDependencies.findBattleById,
    findBattleByLobbyIdDependency: battleDependencies.findBattleByLobbyId,
    saveBattleDependency: battleDependencies.saveBattle,
    updatePlayersStateDependency: playerDependencies.updatePlayersState,
    getPokemonByIdDependency: async (pokemonId) => pokemonCatalogById[pokemonId],
  });

  return {
    state,
    service,
  };
};

test('startBattle creates a battling snapshot and selects the first turn by speed', async () => {
  const { state, service } = createService();

  const battleState = await service.startBattle({
    lobbyId: 'lobby-1',
  });

  assert.equal(battleState.status, BATTLE_STATUS.BATTLING);
  assert.equal(battleState.currentTurnPlayerId, 'player-ash');
  assert.equal(state.battles.length, 1);
  assert.equal(state.lobbies[0].status, LOBBY_STATUS.BATTLING);
  assert.equal(state.players[0].status, 'battling');
  assert.equal(state.players[1].status, 'battling');
});

test('processAttack applies damage and passes the turn to the defender', async () => {
  const { service } = createService();

  const battleState = await service.startBattle({
    lobbyId: 'lobby-1',
  });

  const result = await service.processAttack({
    battleId: battleState.battleId,
    playerId: 'player-ash',
  });

  assert.equal(result.accepted, true);
  assert.equal(result.turnResult.damage, 1);
  assert.equal(result.turnResult.defenderRemainingHp, 159);
  assert.equal(result.turnResult.nextTurnPlayerId, 'player-misty');
  assert.equal(result.battleEnd, null);
});

test('processAttack finishes the battle when the defender has no remaining pokemon', async () => {
  const { state, service } = createService();

  const battleState = await service.startBattle({
    lobbyId: 'lobby-1',
  });

  const battle = state.battles[0];
  battle.players[1].team = [
    {
      pokemonId: 143,
      name: 'Snorlax',
      hp: 1,
      currentHp: 1,
      attack: 110,
      defense: 65,
      speed: 30,
      defeated: false,
    },
  ];

  const result = await service.processAttack({
    battleId: battleState.battleId,
    playerId: 'player-ash',
  });

  assert.equal(result.turnResult.defenderDefeated, true);
  assert.equal(result.turnResult.battleStatus, BATTLE_STATUS.FINISHED);
  assert.equal(result.battleEnd.winnerPlayerId, 'player-ash');
  assert.equal(state.lobbies[0].status, LOBBY_STATUS.FINISHED);
  assert.equal(state.players[0].status, 'idle');
  assert.equal(state.players[1].status, 'idle');
  assert.equal(state.players[0].activeLobbyId, null);
  assert.equal(state.players[1].activeLobbyId, null);
});
