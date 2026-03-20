import http from 'node:http';

import { Server } from 'socket.io';
import { io as createClient } from 'socket.io-client';

import { createBattleService } from '../../../src/modules/battle/services/battle.service.js';
import { createTeamAssignmentService } from '../../../src/modules/lobby/services/team-assignment.service.js';
import { createLobbyService } from '../../../src/modules/lobby/services/lobby.service.js';
import { createSocketHandlersRegistrar } from '../../../src/sockets/register-events.js';
import {
  createInMemoryBattleDependencies,
  createInMemoryLobbyDependencies,
  createInMemoryPlayerDependencies,
  createInMemoryState,
  runImmediate,
} from '../../integration/helpers/in-memory-state.js';

const pokemonCatalog = [
  { id: 1, name: 'Bulbasaur', hp: 45, attack: 49, defense: 49, speed: 45 },
  { id: 4, name: 'Charmander', hp: 39, attack: 52, defense: 43, speed: 65 },
  { id: 7, name: 'Squirtle', hp: 44, attack: 48, defense: 65, speed: 43 },
  { id: 25, name: 'Pikachu', hp: 35, attack: 55, defense: 40, speed: 90 },
  { id: 39, name: 'Jigglypuff', hp: 115, attack: 45, defense: 20, speed: 20 },
  { id: 143, name: 'Snorlax', hp: 160, attack: 110, defense: 65, speed: 30 },
  { id: 149, name: 'Dragonite', hp: 91, attack: 134, defense: 95, speed: 80 },
  { id: 448, name: 'Lucario', hp: 70, attack: 110, defense: 70, speed: 90 },
];

const pokemonCatalogById = Object.fromEntries(pokemonCatalog.map((pokemon) => [pokemon.id, pokemon]));

export const createSocketHarness = async () => {
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
    joinLobbyDependency: lobbyService.joinLobby,
    reconnectPlayerDependency: lobbyService.reconnectPlayer,
    assignRandomTeamDependency: teamAssignmentService.assignRandomTeam,
    markPlayerReadyDependency: lobbyService.markPlayerReady,
    processAttackDependency: battleService.processAttack,
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
    connectClient: async () => {
      const client = createClient(baseUrl, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
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
