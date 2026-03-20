import { AppError } from '../../../shared/errors/AppError.js';
import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import { registerPlayer } from '../../players/services/player.service.js';
import { createLobby, findCurrentLobby, findLobbyById, saveLobby } from '../repositories/lobby.repository.js';
import { findBattleByLobbyId } from '../../battle/repositories/battle.repository.js';
import { startBattle } from '../../battle/services/battle.service.js';

const LOBBY_LOCK_KEY = 'single-lobby';

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

export const joinLobby = async ({ nickname, socketId }) =>
  runSerialized(LOBBY_LOCK_KEY, async () => {
    let lobby = await findCurrentLobby();

    if (!lobby) {
      lobby = await createLobby({
        status: LOBBY_STATUS.WAITING,
        players: [],
      });
    }

    if (lobby.status !== LOBBY_STATUS.WAITING) {
      throw new AppError('Lobby is not accepting players', 409);
    }

    if (lobby.players.length >= 2) {
      throw new AppError('Lobby is full', 409);
    }

    const player = await registerPlayer({ nickname, socketId });

    lobby.players.push({
      playerId: player.id,
      nickname: player.nickname,
      ready: false,
      team: [],
    });

    await saveLobby(lobby);

    return {
      playerId: player.id,
      lobbyId: lobby.id,
      status: lobby.status,
      lobbyStatus: normalizeLobbyStatusPayload(lobby),
    };
  });

export const markPlayerReady = async ({ lobbyId, playerId }) =>
  runSerialized(LOBBY_LOCK_KEY, async () => {
    if (!lobbyId || !playerId) {
      throw new AppError('lobbyId and playerId are required', 400);
    }

    const lobby = await findLobbyById(lobbyId);

    if (!lobby) {
      throw new AppError('Lobby not found', 404);
    }

    const currentPlayer = lobby.players.find((player) => String(player.playerId) === String(playerId));

    if (!currentPlayer) {
      throw new AppError('Player does not belong to the lobby', 404);
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

    await saveLobby(lobby);

    const lobbyStatus = normalizeLobbyStatusPayload(lobby);

    if (lobby.status !== LOBBY_STATUS.READY) {
      return {
        lobbyId: lobby.id,
        playerId: String(currentPlayer.playerId),
        ready: true,
        lobbyStatus,
      };
    }

    const existingBattle = await findBattleByLobbyId(lobby.id);

    if (existingBattle && existingBattle.status !== 'finished') {
      throw new AppError('Battle already exists for this lobby', 409);
    }

    const battleStart = await startBattle({ lobbyId: lobby.id });

    return {
      lobbyId: lobby.id,
      playerId: String(currentPlayer.playerId),
      ready: true,
      lobbyStatus,
      battleStart,
    };
  });
