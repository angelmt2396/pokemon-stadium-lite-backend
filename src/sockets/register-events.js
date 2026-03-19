import { registerBattleSocketHandlers } from '../modules/battle/socket/battle.socket.js';
import { registerLobbySocketHandlers } from '../modules/lobby/socket/lobby.socket.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    registerLobbySocketHandlers(socket, io);
    registerBattleSocketHandlers(socket, io);
  });
};
