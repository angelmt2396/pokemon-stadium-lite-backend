import { findLobbyById, saveLobby } from '../repositories/lobby.repository.js';
import { listPokemon } from '../../pokemon/services/pokemon.service.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { normalizeLobbyStatusPayload } from './lobby.service.js';

const lobbyLockKey = (lobbyId) => `lobby:${lobbyId}`;

export const createTeamSelection = (catalog, amount) => {
  const pool = [...catalog];
  const selected = [];

  while (selected.length < amount && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
};

export const createTeamAssignmentService = (dependencies = {}) => {
  const {
    findLobbyByIdDependency = findLobbyById,
    saveLobbyDependency = saveLobby,
    listPokemonDependency = listPokemon,
    runSerializedDependency = runSerialized,
    normalizeLobbyStatusPayloadDependency = normalizeLobbyStatusPayload,
  } = dependencies;

  const assignRandomTeam = async ({ lobbyId, playerId }) =>
    runSerializedDependency(lobbyLockKey(lobbyId), async () => {
      if (!lobbyId || !playerId) {
        throw new AppError('lobbyId and playerId are required', 400);
      }

      const lobby = await findLobbyByIdDependency(lobbyId);

      if (!lobby) {
        throw new AppError('Lobby not found', 404);
      }

      const currentPlayer = lobby.players.find((player) => String(player.playerId) === String(playerId));

      if (!currentPlayer) {
        throw new AppError('Player does not belong to the lobby', 404);
      }

      if (lobby.status !== LOBBY_STATUS.WAITING) {
        throw new AppError('Lobby is not accepting team assignment', 409);
      }

      if (lobby.players.length < 2) {
        throw new AppError('Two players are required before assigning pokemon', 409);
      }

      if (lobby.players.some((player) => player.ready)) {
        throw new AppError('Team assignment is locked once a player is ready', 409);
      }

      const playersAlreadyAssigned = lobby.players.every((player) => player.team.length === 3);

      if (!playersAlreadyAssigned) {
        const catalog = await listPokemonDependency();

        if (catalog.length < 6) {
          throw new AppError('Pokemon catalog does not contain enough entries', 500);
        }

        const selectedPokemon = createTeamSelection(catalog, 6);

        lobby.players[0].team = selectedPokemon.slice(0, 3).map((pokemon) => ({
          pokemonId: pokemon.id,
          name: pokemon.name,
        }));
        lobby.players[1].team = selectedPokemon.slice(3, 6).map((pokemon) => ({
          pokemonId: pokemon.id,
          name: pokemon.name,
        }));

        await saveLobbyDependency(lobby);
      }

      const updatedPlayer = lobby.players.find((player) => String(player.playerId) === String(playerId));

      return {
        lobbyId: lobby.id,
        playerId: String(updatedPlayer.playerId),
        team: updatedPlayer.team.map((pokemon) => ({
          pokemonId: pokemon.pokemonId,
          name: pokemon.name,
        })),
        lobbyStatus: normalizeLobbyStatusPayloadDependency(lobby),
      };
    });

  return {
    assignRandomTeam,
  };
};

export const { assignRandomTeam } = createTeamAssignmentService();
