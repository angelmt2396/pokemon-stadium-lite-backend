import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { logger } from '../../../shared/logger/logger.js';
import { cancelSearch, joinLobby, markPlayerReady, reconnectPlayer } from '../services/lobby.service.js';
import { assignRandomTeam } from '../services/team-assignment.service.js';

const respond = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

export const createLobbySocketHandlers = (dependencies = {}) => {
  const {
    joinLobbyDependency = joinLobby,
    cancelSearchDependency = cancelSearch,
    reconnectPlayerDependency = reconnectPlayer,
    assignRandomTeamDependency = assignRandomTeam,
    markPlayerReadyDependency = markPlayerReady,
  } = dependencies;

  return (socket, io) => {
    const handleJoinLobby = (eventName) => async (payload, callback) => {
      try {
        logger.info('socket_join_lobby_received', {
          event: eventName,
          socketId: socket.id,
          nickname: payload?.nickname,
        });

        const result = await joinLobbyDependency({
          nickname: payload?.nickname,
          socketId: socket.id,
        });

        socket.join(result.lobbyId);
        io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

        if (result.lobbyStatus.players.length === 1) {
          socket.emit(SOCKET_EVENTS.SERVER.SEARCH_STATUS, {
            playerId: result.playerId,
            status: 'searching',
            lobbyId: result.lobbyId,
          });
        }

        if (result.lobbyStatus.players.length === 2) {
          io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.MATCH_FOUND, {
            lobbyId: result.lobbyId,
            players: result.lobbyStatus.players,
          });
        }

        respond(callback, {
          ok: true,
          data: result,
        });

        logger.info('socket_join_lobby_completed', {
          event: eventName,
          socketId: socket.id,
          playerId: result.playerId,
          lobbyId: result.lobbyId,
          playersInLobby: result.lobbyStatus.players.length,
        });
      } catch (error) {
        logger.warn('socket_join_lobby_failed', {
          event: eventName,
          socketId: socket.id,
          nickname: payload?.nickname,
          error: error.message,
        });

        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    };

    socket.on(SOCKET_EVENTS.CLIENT.JOIN_LOBBY, handleJoinLobby(SOCKET_EVENTS.CLIENT.JOIN_LOBBY));
    socket.on(
      SOCKET_EVENTS.CLIENT.SEARCH_MATCH,
      handleJoinLobby(SOCKET_EVENTS.CLIENT.SEARCH_MATCH),
    );

    socket.on(SOCKET_EVENTS.CLIENT.CANCEL_SEARCH, async (payload, callback) => {
      try {
        logger.info('socket_cancel_search_received', {
          socketId: socket.id,
          playerId: payload?.playerId,
        });

        const result = await cancelSearchDependency({
          playerId: payload?.playerId,
        });

        socket.emit(SOCKET_EVENTS.SERVER.SEARCH_STATUS, {
          playerId: result.playerId,
          status: 'idle',
          canceled: true,
        });

        respond(callback, {
          ok: true,
          data: result,
        });

        logger.info('socket_cancel_search_completed', {
          socketId: socket.id,
          playerId: result.playerId,
          lobbyId: result.lobbyId,
        });
      } catch (error) {
        logger.warn('socket_cancel_search_failed', {
          socketId: socket.id,
          playerId: payload?.playerId,
          error: error.message,
        });

        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CLIENT.RECONNECT_PLAYER, async (payload, callback) => {
      try {
        logger.info('socket_reconnect_player_received', {
          socketId: socket.id,
          playerId: payload?.playerId,
        });

        const result = await reconnectPlayerDependency({
          playerId: payload?.playerId,
          socketId: socket.id,
        });

        if (result.previousSocketId && result.previousSocketId !== socket.id) {
          const previousSocket = io.sockets.sockets.get(result.previousSocketId);

          if (previousSocket) {
            previousSocket.disconnect(true);
          }
        }

        socket.join(result.lobbyId);
        socket.emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

        if (result.battleState) {
          const serverEvent =
            result.battleState.status === BATTLE_STATUS.FINISHED
              ? SOCKET_EVENTS.SERVER.BATTLE_END
              : SOCKET_EVENTS.SERVER.BATTLE_START;

          socket.emit(serverEvent, result.battleState);
        }

        respond(callback, {
          ok: true,
          data: result,
        });

        logger.info('socket_reconnect_player_completed', {
          socketId: socket.id,
          playerId: result.playerId,
          lobbyId: result.lobbyId,
          battleId: result.battleState?.battleId ?? null,
        });
      } catch (error) {
        logger.warn('socket_reconnect_player_failed', {
          socketId: socket.id,
          playerId: payload?.playerId,
          error: error.message,
        });

        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CLIENT.ASSIGN_POKEMON, async (payload, callback) => {
      try {
        logger.info('socket_assign_pokemon_received', {
          socketId: socket.id,
          playerId: payload?.playerId,
          lobbyId: payload?.lobbyId,
        });

        const result = await assignRandomTeamDependency({
          lobbyId: payload?.lobbyId,
          playerId: payload?.playerId,
        });

        io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

        respond(callback, {
          ok: true,
          data: result,
        });

        logger.info('socket_assign_pokemon_completed', {
          socketId: socket.id,
          playerId: result.playerId,
          lobbyId: result.lobbyId,
        });
      } catch (error) {
        logger.warn('socket_assign_pokemon_failed', {
          socketId: socket.id,
          playerId: payload?.playerId,
          lobbyId: payload?.lobbyId,
          error: error.message,
        });

        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CLIENT.READY, async (payload, callback) => {
      try {
        logger.info('socket_ready_received', {
          socketId: socket.id,
          playerId: payload?.playerId,
          lobbyId: payload?.lobbyId,
        });

        const result = await markPlayerReadyDependency({
          lobbyId: payload?.lobbyId,
          playerId: payload?.playerId,
        });

        io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

        if (result.battleStart) {
          io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.BATTLE_START, result.battleStart);
        }

        respond(callback, {
          ok: true,
          data: result,
        });

        logger.info('socket_ready_completed', {
          socketId: socket.id,
          playerId: result.playerId,
          lobbyId: result.lobbyId,
          battleId: result.battleStart?.battleId ?? null,
        });
      } catch (error) {
        logger.warn('socket_ready_failed', {
          socketId: socket.id,
          playerId: payload?.playerId,
          lobbyId: payload?.lobbyId,
          error: error.message,
        });

        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    });
  };
};

export const registerLobbySocketHandlers = createLobbySocketHandlers();
