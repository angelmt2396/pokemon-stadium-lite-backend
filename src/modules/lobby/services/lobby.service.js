import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { findPlayerById, updatePlayerSocket } from '../../players/repositories/player.repository.js';
import { registerPlayer } from '../../players/services/player.service.js';
import {
  createLobby,
  findCurrentLobby,
  findLobbyById,
  findLobbyByPlayerId,
  findWaitingLobby,
  saveLobby,
} from '../repositories/lobby.repository.js';
import { findBattleByLobbyId } from '../../battle/repositories/battle.repository.js';
import { normalizeBattleStatePayload, startBattle } from '../../battle/services/battle.service.js';

const LOBBY_LOCK_KEY = 'single-lobby';
const normalizeNickname = (nickname) => nickname.trim().toLowerCase();

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
    registerPlayerDependency = registerPlayer,
    createLobbyDependency = createLobby,
    findCurrentLobbyDependency = findCurrentLobby,
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

    if (waitingLobby && waitingLobby.players.length < 2) {
      return waitingLobby;
    }

    const currentLobby = await findCurrentLobbyDependency();

    if (!currentLobby) {
      return createLobbyDependency({
        status: LOBBY_STATUS.WAITING,
        players: [],
      });
    }

    if (currentLobby.status === LOBBY_STATUS.WAITING) {
      throw new AppError('Lobby is full', 409);
    }

    const currentBattle = await findBattleByLobbyIdDependency(currentLobby.id);

    if (!currentBattle || currentBattle.status === BATTLE_STATUS.FINISHED) {
      return createLobbyDependency({
        status: LOBBY_STATUS.WAITING,
        players: [],
      });
    }

    throw new AppError('Lobby is not accepting players', 409);
  };

  const joinLobby = async ({ nickname, socketId }) =>
    runSerializedDependency(LOBBY_LOCK_KEY, async () => {
      const lobby = await resolveLobbyForJoin();
      const normalizedNickname = normalizeNickname(nickname);

      const duplicatedNickname = lobby.players.find(
        (player) => normalizeNickname(player.nickname) === normalizedNickname,
      );

      if (duplicatedNickname) {
        throw new AppError('Nickname is already taken in the current lobby', 409);
      }

      const player = await registerPlayerDependency({ nickname, socketId });

      lobby.players.push({
        playerId: player.id,
        nickname: player.nickname,
        ready: false,
        team: [],
      });

      await saveLobbyDependency(lobby);

      return {
        playerId: player.id,
        lobbyId: lobby.id,
        status: lobby.status,
        lobbyStatus: normalizeLobbyStatusPayload(lobby),
      };
    });

  const reconnectPlayer = async ({ playerId, socketId }) =>
    runSerializedDependency(LOBBY_LOCK_KEY, async () => {
      if (!playerId || !socketId) {
        throw new AppError('playerId and socketId are required', 400);
      }

      const player = await findPlayerByIdDependency(playerId);

      if (!player) {
        throw new AppError('Player not found', 404);
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
    runSerializedDependency(LOBBY_LOCK_KEY, async () => {
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

  return {
    joinLobby,
    reconnectPlayer,
    markPlayerReady,
  };
};

export const { joinLobby, reconnectPlayer, markPlayerReady } = createLobbyService();
