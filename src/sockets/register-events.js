import { createBattleSocketHandlers, registerBattleSocketHandlers } from '../modules/battle/socket/battle.socket.js';
import { createLobbySocketHandlers, registerLobbySocketHandlers } from '../modules/lobby/socket/lobby.socket.js';

export const createSocketHandlersRegistrar = (dependencies = {}) => {
  const registerLobbyHandlers =
    dependencies.registerLobbyHandlersDependency ??
    createLobbySocketHandlers({
      joinLobbyDependency: dependencies.joinLobbyDependency,
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
    io.on('connection', (socket) => {
      registerLobbyHandlers(socket, io);
      registerBattleHandlers(socket, io);
    });
  };
};

export const registerSocketHandlers = createSocketHandlersRegistrar({
  registerLobbyHandlersDependency: registerLobbySocketHandlers,
  registerBattleHandlersDependency: registerBattleSocketHandlers,
});
