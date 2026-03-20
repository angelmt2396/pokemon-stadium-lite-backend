import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';
import { joinLobby, markPlayerReady, reconnectPlayer } from '../services/lobby.service.js';
import { assignRandomTeam } from '../services/team-assignment.service.js';

const respond = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

export const registerLobbySocketHandlers = (socket, io) => {
  socket.on(SOCKET_EVENTS.CLIENT.JOIN_LOBBY, async (payload, callback) => {
    try {
      const result = await joinLobby({
        nickname: payload?.nickname,
        socketId: socket.id,
      });

      socket.join(result.lobbyId);
      io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

      respond(callback, {
        ok: true,
        data: result,
      });
    } catch (error) {
      respond(callback, {
        ok: false,
        message: error.message,
      });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.RECONNECT_PLAYER, async (payload, callback) => {
    try {
      const result = await reconnectPlayer({
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
    } catch (error) {
      respond(callback, {
        ok: false,
        message: error.message,
      });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.ASSIGN_POKEMON, async (payload, callback) => {
    try {
      const result = await assignRandomTeam({
        lobbyId: payload?.lobbyId,
        playerId: payload?.playerId,
      });

      io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.LOBBY_STATUS, result.lobbyStatus);

      respond(callback, {
        ok: true,
        data: result,
      });
    } catch (error) {
      respond(callback, {
        ok: false,
        message: error.message,
      });
    }
  });

  socket.on(SOCKET_EVENTS.CLIENT.READY, async (payload, callback) => {
    try {
      const result = await markPlayerReady({
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
    } catch (error) {
      respond(callback, {
        ok: false,
        message: error.message,
      });
    }
  });
};
