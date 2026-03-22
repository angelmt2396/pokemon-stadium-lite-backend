import { createSocketSessionAuthMiddleware } from '../shared/auth/session-auth.js';
import { createBattleSocketHandlers, registerBattleSocketHandlers } from '../modules/battle/socket/battle.socket.js';
import { createLobbySocketHandlers, registerLobbySocketHandlers } from '../modules/lobby/socket/lobby.socket.js';
import { logger } from '../shared/logger/logger.js';

export const createSocketHandlersRegistrar = (dependencies = {}) => {
  const authenticateSocket =
    dependencies.authenticateSocketDependency ??
    createSocketSessionAuthMiddleware({
      authenticatePlayerSessionDependency: dependencies.authenticatePlayerSessionDependency,
    });
  const registerLobbyHandlers =
    dependencies.registerLobbyHandlersDependency ??
    createLobbySocketHandlers({
      joinLobbyDependency: dependencies.joinLobbyDependency,
      cancelSearchDependency: dependencies.cancelSearchDependency,
      reconnectPlayerDependency: dependencies.reconnectPlayerDependency,
      assignRandomTeamDependency: dependencies.assignRandomTeamDependency,
      markPlayerReadyDependency: dependencies.markPlayerReadyDependency,
    });
  const registerBattleHandlers =
    dependencies.registerBattleHandlersDependency ??
    createBattleSocketHandlers({
      processAttackDependency: dependencies.processAttackDependency,
    });

  return (io) => {
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
      logger.info('socket_connected', {
        socketId: socket.id,
        playerId: socket.data.player?.playerId ?? null,
      });

      socket.on('disconnect', (reason) => {
        logger.info('socket_disconnected', {
          socketId: socket.id,
          reason,
        });
      });

      registerLobbyHandlers(socket, io);
      registerBattleHandlers(socket, io);
    });
  };
};

export const registerSocketHandlers = createSocketHandlersRegistrar({
  registerLobbyHandlersDependency: registerLobbySocketHandlers,
  registerBattleHandlersDependency: registerBattleSocketHandlers,
});
