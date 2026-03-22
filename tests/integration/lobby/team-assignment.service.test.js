import test from 'node:test';
import assert from 'node:assert/strict';

import { createTeamAssignmentService } from '../../../src/modules/lobby/services/team-assignment.service.js';
import { LOBBY_STATUS } from '../../../src/shared/constants/lobby-status.js';
import {
  createInMemoryLobbyDependencies,
  createInMemoryState,
  runImmediate,
} from '../helpers/in-memory-state.js';

const pokemonCatalog = [
  { id: 1, name: 'Bulbasaur', sprite: 'https://example.test/bulbasaur.gif' },
  { id: 2, name: 'Ivysaur', sprite: 'https://example.test/ivysaur.gif' },
  { id: 3, name: 'Venusaur', sprite: 'https://example.test/venusaur.gif' },
  { id: 4, name: 'Charmander', sprite: 'https://example.test/charmander.gif' },
  { id: 5, name: 'Charmeleon', sprite: 'https://example.test/charmeleon.gif' },
  { id: 6, name: 'Charizard', sprite: 'https://example.test/charizard.gif' },
  { id: 7, name: 'Squirtle', sprite: 'https://example.test/squirtle.gif' },
  { id: 8, name: 'Wartortle', sprite: 'https://example.test/wartortle.gif' },
];

const createService = () => {
  const state = createInMemoryState();
  const lobbyDependencies = createInMemoryLobbyDependencies(state);

  const lobby = {
    id: 'lobby-1',
    status: LOBBY_STATUS.WAITING,
    players: [
      { playerId: 'player-ash', nickname: 'Ash', ready: false, team: [] },
      { playerId: 'player-misty', nickname: 'Misty', ready: false, team: [] },
    ],
  };

  state.lobbies.push(lobby);

  const service = createTeamAssignmentService({
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    listPokemonDependency: async () => pokemonCatalog,
    runSerializedDependency: runImmediate,
  });

  return {
    state,
    lobby,
    service,
  };
};

test('assignRandomTeam assigns three pokemon to each player without duplicates between teams', async () => {
  const { state, service } = createService();

  const response = await service.assignRandomTeam({
    lobbyId: 'lobby-1',
    playerId: 'player-ash',
  });

  const allAssignedIds = state.lobbies[0].players.flatMap((player) => player.team.map((pokemon) => pokemon.pokemonId));
  const uniqueIds = new Set(allAssignedIds);

  assert.equal(response.team.length, 3);
  assert.equal(typeof response.team[0].sprite, 'string');
  assert.equal(state.lobbies[0].players[1].team.length, 3);
  assert.equal(allAssignedIds.length, 6);
  assert.equal(uniqueIds.size, 6);
});

test('assignRandomTeam is idempotent before any player is ready', async () => {
  const { service } = createService();

  const firstResponse = await service.assignRandomTeam({
    lobbyId: 'lobby-1',
    playerId: 'player-ash',
  });

  const secondResponse = await service.assignRandomTeam({
    lobbyId: 'lobby-1',
    playerId: 'player-ash',
  });

  assert.deepEqual(secondResponse.team, firstResponse.team);
});

test('assignRandomTeam is rejected once any player is ready', async () => {
  const { lobby, service } = createService();

  lobby.players[0].ready = true;

  await assert.rejects(
    () =>
      service.assignRandomTeam({
        lobbyId: 'lobby-1',
        playerId: 'player-misty',
      }),
    {
      message: 'Team assignment is locked once a player is ready',
    },
  );
});
