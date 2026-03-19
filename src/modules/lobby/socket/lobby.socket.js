import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
import { joinLobby, markPlayerReady } from '../services/lobby.service.js';
import { assignRandomTeam } from '../services/team-assignment.service.js';

const respond = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

export const registerLobbySocketHandlers = (socket) => {
  socket.on(SOCKET_EVENTS.CLIENT.JOIN_LOBBY, async (payload, callback) => {
    try {
      const result = await joinLobby({
        nickname: payload?.nickname,
        socketId: socket.id,
      });

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
