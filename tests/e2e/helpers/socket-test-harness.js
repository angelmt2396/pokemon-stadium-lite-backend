import http from 'node:http';

import { Server } from 'socket.io';
import { io as createClient } from 'socket.io-client';

import { createBattleService } from '../../../src/modules/battle/services/battle.service.js';
import { createTeamAssignmentService } from '../../../src/modules/lobby/services/team-assignment.service.js';
import { createLobbyService } from '../../../src/modules/lobby/services/lobby.service.js';
import { createPlayerSessionService } from '../../../src/modules/players/services/player-session.service.js';
import { createSocketHandlersRegistrar } from '../../../src/sockets/register-events.js';
import {
  createInMemoryBattleDependencies,
  createInMemoryLobbyDependencies,
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../../integration/helpers/in-memory-state.js';

const pokemonCatalog = [
  { id: 1, name: 'Bulbasaur', sprite: 'https://example.test/bulbasaur.gif', hp: 45, attack: 49, defense: 49, speed: 45 },
  { id: 4, name: 'Charmander', sprite: 'https://example.test/charmander.gif', hp: 39, attack: 52, defense: 43, speed: 65 },
  { id: 7, name: 'Squirtle', sprite: 'https://example.test/squirtle.gif', hp: 44, attack: 48, defense: 65, speed: 43 },
  { id: 25, name: 'Pikachu', sprite: 'https://example.test/pikachu.gif', hp: 35, attack: 55, defense: 40, speed: 90 },
  { id: 39, name: 'Jigglypuff', sprite: 'https://example.test/jigglypuff.gif', hp: 115, attack: 45, defense: 20, speed: 20 },
  { id: 143, name: 'Snorlax', sprite: 'https://example.test/snorlax.gif', hp: 160, attack: 110, defense: 65, speed: 30 },
  { id: 149, name: 'Dragonite', sprite: 'https://example.test/dragonite.gif', hp: 91, attack: 134, defense: 95, speed: 80 },
  { id: 448, name: 'Lucario', sprite: 'https://example.test/lucario.gif', hp: 70, attack: 110, defense: 70, speed: 90 },
];

const pokemonCatalogById = Object.fromEntries(pokemonCatalog.map((pokemon) => [pokemon.id, pokemon]));

export const createSocketHarness = async ({ disconnectGracePeriodMs } = {}) => {
  const state = createInMemoryState();
  const lobbyDependencies = createInMemoryLobbyDependencies(state);
  const playerDependencies = createInMemoryPlayerDependencies(state);
  const battleDependencies = createInMemoryBattleDependencies(state);

  const playerSessionService = createPlayerSessionService({
    runSerializedDependency: runImmediate,
    createPlayerDependency: playerDependencies.createPlayer,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    findPlayerByNicknameNormalizedDependency: playerDependencies.findPlayerByNicknameNormalized,
    findPlayerBySessionTokenHashDependency: playerDependencies.findPlayerBySessionTokenHash,
    updatePlayerStateDependency: playerDependencies.updatePlayerState,
  });

  const battleService = createBattleService({
    runSerializedDependency: runImmediate,
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    createBattleDependency: battleDependencies.createBattle,
    findBattleByIdDependency: battleDependencies.findBattleById,
    findBattleByLobbyIdDependency: battleDependencies.findBattleByLobbyId,
    saveBattleDependency: battleDependencies.saveBattle,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    updatePlayerStateDependency: playerDependencies.updatePlayerState,
    updatePlayersStateDependency: playerDependencies.updatePlayersState,
    getPokemonByIdDependency: async (pokemonId) => pokemonCatalogById[pokemonId],
  });

  const lobbyService = createLobbyService({
    runSerializedDependency: runImmediate,
    findPlayerByIdDependency: playerDependencies.findPlayerById,
    updatePlayerSocketDependency: playerDependencies.updatePlayerSocket,
    updatePlayerStateDependency: playerDependencies.updatePlayerState,
    updatePlayersStateDependency: playerDependencies.updatePlayersState,
    createLobbyDependency: lobbyDependencies.createLobby,
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    findLobbyByPlayerIdDependency: lobbyDependencies.findLobbyByPlayerId,
    findWaitingLobbyDependency: lobbyDependencies.findWaitingLobby,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    findBattleByLobbyIdDependency: battleDependencies.findBattleByLobbyId,
    resumeBattleAfterReconnectDependency: battleService.resumeBattleAfterReconnect,
    startBattleDependency: battleService.startBattle,
  });

  const teamAssignmentService = createTeamAssignmentService({
    findLobbyByIdDependency: lobbyDependencies.findLobbyById,
    saveLobbyDependency: lobbyDependencies.saveLobby,
    listPokemonDependency: async () => pokemonCatalog,
    runSerializedDependency: runImmediate,
  });

  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const registerHandlers = createSocketHandlersRegistrar({
    authenticatePlayerSessionDependency: playerSessionService.authenticatePlayerSession,
    bindPlayerSocketDependency: playerSessionService.bindPlayerSocket,
    markPlayerDisconnectedDependency: playerSessionService.markPlayerDisconnected,
    joinLobbyDependency: lobbyService.joinLobby,
    cancelSearchDependency: lobbyService.cancelSearch,
    reconnectPlayerDependency: lobbyService.reconnectPlayer,
    assignRandomTeamDependency: teamAssignmentService.assignRandomTeam,
    markPlayerReadyDependency: lobbyService.markPlayerReady,
    processAttackDependency: battleService.processAttack,
    pauseBattleForDisconnectDependency: battleService.pauseBattleForDisconnect,
    finishBattleByDisconnectTimeoutDependency: battleService.finishBattleByDisconnectTimeout,
    disconnectGracePeriodMs,
  });

  registerHandlers(io);

  await new Promise((resolve, reject) => {
    httpServer.listen(0, '127.0.0.1', (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve socket test server address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const clients = new Set();

  return {
    state,
    baseUrl,
    createSession: async (nickname) => playerSessionService.createOrRefreshSession({ nickname }),
    connectClient: async (options = {}) => {
      const client = createClient(baseUrl, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        auth: {
          sessionToken: options.sessionToken ?? '',
        },
      });

      clients.add(client);

      await new Promise((resolve, reject) => {
        client.once('connect', resolve);
        client.once('connect_error', reject);
      });

      return client;
    },
    close: async () => {
      for (const client of clients) {
        if (client.connected) {
          client.disconnect();
        } else {
          client.close();
        }
      }

      await new Promise((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          if (!httpServer.listening) {
            resolve();
            return;
          }

          httpServer.close((serverError) => {
            if (serverError && serverError.code !== 'ERR_SERVER_NOT_RUNNING') {
              reject(serverError);
              return;
            }

            resolve();
          });
        });
      });
    },
  };
};

export const onceEvent = (socket, eventName) =>
  new Promise((resolve) => {
    socket.once(eventName, resolve);
  });

export const emitWithAck = (socket, eventName, payload) =>
  new Promise((resolve) => {
    socket.emit(eventName, payload, resolve);
  });
