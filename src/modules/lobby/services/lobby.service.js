import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { findPlayerById, updatePlayerSocket, updatePlayerState, updatePlayersState } from '../../players/repositories/player.repository.js';
import {
  createLobby,
  findLobbyById,
  findLobbyByPlayerId,
  findWaitingLobby,
  saveLobby,
} from '../repositories/lobby.repository.js';
import { findBattleByLobbyId } from '../../battle/repositories/battle.repository.js';
import { normalizeBattleStatePayload, startBattle } from '../../battle/services/battle.service.js';

const MATCHMAKING_LOCK_KEY = 'matchmaking';
const normalizeNickname = (nickname) => nickname.trim().toLowerCase();
const lobbyLockKey = (lobbyId) => `lobby:${lobbyId}`;
const playerLockKey = (playerId) => `player:${playerId}`;

export const normalizeLobbyStatusPayload = (lobby) => ({
  lobbyId: lobby.id,
  status: lobby.status,
  players: lobby.players.map((player) => ({
    playerId: String(player.playerId),
    nickname: player.nickname,
    ready: player.ready,
    team: player.team.map((pokemon) => ({
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
    })),
  })),
});

export const createLobbyService = (dependencies = {}) => {
  const {
    runSerializedDependency = runSerialized,
    findPlayerByIdDependency = findPlayerById,
    updatePlayerSocketDependency = updatePlayerSocket,
    updatePlayerStateDependency = updatePlayerState,
    updatePlayersStateDependency = updatePlayersState,
    createLobbyDependency = createLobby,
    findLobbyByIdDependency = findLobbyById,
    findLobbyByPlayerIdDependency = findLobbyByPlayerId,
    findWaitingLobbyDependency = findWaitingLobby,
    saveLobbyDependency = saveLobby,
    findBattleByLobbyIdDependency = findBattleByLobbyId,
    normalizeBattleStatePayloadDependency = normalizeBattleStatePayload,
    startBattleDependency = startBattle,
  } = dependencies;

  const resolveLobbyForJoin = async () => {
    const waitingLobby = await findWaitingLobbyDependency();

    if (waitingLobby) {
      return waitingLobby;
    }

    return createLobbyDependency({
      status: LOBBY_STATUS.WAITING,
      players: [],
    });
  };

  const joinLobby = async ({ playerId, socketId }) =>
    runSerializedDependency(MATCHMAKING_LOCK_KEY, async () => {
      if (!playerId || !socketId) {
        throw new AppError('playerId and socketId are required', 400);
      }

      const player = await findPlayerByIdDependency(playerId);

      if (!player) {
        throw new AppError('Player not found', 404);
      }

      if (
        player.status !== PLAYER_STATUS.IDLE ||
        player.activeLobbyId !== null ||
        player.activeBattleId !== null
      ) {
        throw new AppError('Player already has an active lobby or battle', 409);
      }

      const lobby = await resolveLobbyForJoin();
      const normalizedNickname = normalizeNickname(player.nickname);

      const duplicatedNickname = lobby.players.find(
        (player) => normalizeNickname(player.nickname) === normalizedNickname,
      );

      if (duplicatedNickname) {
        throw new AppError('Nickname is already taken in the current lobby', 409);
      }

      lobby.players.push({
        playerId: player.id,
        nickname: player.nickname,
        ready: false,
        team: [],
      });

      await saveLobbyDependency(lobby);

      const playerIds = lobby.players.map((playerEntry) => playerEntry.playerId);
      const lobbyPlayerStatus = lobby.players.length === 2 ? PLAYER_STATUS.IN_LOBBY : PLAYER_STATUS.SEARCHING;

      await updatePlayerStateDependency(player.id, {
        socketId,
        status: lobbyPlayerStatus,
        activeLobbyId: lobby.id,
        activeBattleId: null,
        lastSeenAt: new Date(),
      });

      if (lobby.players.length === 2) {
        const otherPlayerIds = playerIds.filter((currentPlayerId) => String(currentPlayerId) !== String(player.id));

        if (otherPlayerIds.length > 0) {
          await updatePlayersStateDependency(otherPlayerIds, {
            status: PLAYER_STATUS.IN_LOBBY,
            activeLobbyId: lobby.id,
          });
        }
      }

      return {
        playerId: player.id,
        reconnectToken: player.reconnectToken,
        lobbyId: lobby.id,
        status: lobby.status,
        lobbyStatus: normalizeLobbyStatusPayload(lobby),
      };
    });

  const reconnectPlayer = async ({ playerId, reconnectToken, socketId }) =>
    runSerializedDependency(playerLockKey(playerId), async () => {
      if (!playerId || !reconnectToken || !socketId) {
        throw new AppError('playerId, reconnectToken and socketId are required', 400);
      }

      const player = await findPlayerByIdDependency(playerId);

      if (!player) {
        throw new AppError('Player not found', 404);
      }

      if (player.reconnectToken !== reconnectToken) {
        throw new AppError('Invalid reconnect token', 403);
      }

      const lobby = await findLobbyByPlayerIdDependency(player.id);

      if (!lobby) {
        throw new AppError('Lobby not found for player', 404);
      }

      const previousSocketId = player.socketId;
      const updatedPlayer = await updatePlayerSocketDependency(player.id, socketId);
      const battle = await findBattleByLobbyIdDependency(lobby.id);

      return {
        playerId: updatedPlayer.id,
        lobbyId: lobby.id,
        previousSocketId,
        lobbyStatus: normalizeLobbyStatusPayload(lobby),
        battleState: battle ? normalizeBattleStatePayloadDependency(battle) : null,
      };
    });

  const markPlayerReady = async ({ lobbyId, playerId }) =>
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

      const existingBattle = await findBattleByLobbyIdDependency(lobby.id);

      if (currentPlayer.ready) {
        return {
          lobbyId: lobby.id,
          playerId: String(currentPlayer.playerId),
          ready: true,
          lobbyStatus: normalizeLobbyStatusPayload(lobby),
          battleStart:
            existingBattle && existingBattle.status !== BATTLE_STATUS.FINISHED
              ? normalizeBattleStatePayloadDependency(existingBattle)
              : null,
        };
      }

      if (lobby.status === LOBBY_STATUS.BATTLING || lobby.status === LOBBY_STATUS.FINISHED) {
        throw new AppError('Lobby is not accepting ready updates', 409);
      }

      if (currentPlayer.team.length !== 3) {
        throw new AppError('Player does not have an assigned team', 409);
      }

      currentPlayer.ready = true;

      if (lobby.players.length === 2 && lobby.players.every((player) => player.ready)) {
        lobby.status = LOBBY_STATUS.READY;
      }

      await saveLobbyDependency(lobby);

      const lobbyStatus = normalizeLobbyStatusPayload(lobby);

      if (lobby.status !== LOBBY_STATUS.READY) {
        return {
          lobbyId: lobby.id,
          playerId: String(currentPlayer.playerId),
          ready: true,
          lobbyStatus,
        };
      }

      if (existingBattle && existingBattle.status !== 'finished') {
        throw new AppError('Battle already exists for this lobby', 409);
      }

      const battleStart = await startBattleDependency({ lobbyId: lobby.id });

      return {
        lobbyId: lobby.id,
        playerId: String(currentPlayer.playerId),
        ready: true,
        lobbyStatus,
        battleStart,
      };
    });

  const cancelSearch = async ({ playerId }) =>
    runSerializedDependency(playerLockKey(playerId), async () => {
      if (!playerId) {
        throw new AppError('playerId is required', 400);
      }

      const player = await findPlayerByIdDependency(playerId);

      if (!player) {
        throw new AppError('Player not found', 404);
      }

      if (player.status !== PLAYER_STATUS.SEARCHING) {
        throw new AppError('Player is not in matchmaking search', 409);
      }

      const lobby = await findLobbyByPlayerIdDependency(player.id);

      if (!lobby) {
        await updatePlayerStateDependency(player.id, {
          status: PLAYER_STATUS.IDLE,
          activeLobbyId: null,
          activeBattleId: null,
        });

        return {
          playerId: player.id,
          canceled: true,
          lobbyId: null,
          lobbyStatus: null,
        };
      }

      if (lobby.status !== LOBBY_STATUS.WAITING || lobby.players.length !== 1) {
        throw new AppError('Player can only cancel while waiting for a match', 409);
      }

      lobby.players = lobby.players.filter((entry) => String(entry.playerId) !== String(player.id));
      lobby.status = LOBBY_STATUS.FINISHED;

      await saveLobbyDependency(lobby);
      await updatePlayerStateDependency(player.id, {
        status: PLAYER_STATUS.IDLE,
        activeLobbyId: null,
        activeBattleId: null,
      });

      return {
        playerId: player.id,
        canceled: true,
        lobbyId: lobby.id,
        lobbyStatus: normalizeLobbyStatusPayload(lobby),
      };
    });

  return {
    joinLobby,
    reconnectPlayer,
    markPlayerReady,
    cancelSearch,
  };
};

export const { joinLobby, reconnectPlayer, markPlayerReady, cancelSearch } = createLobbyService();
