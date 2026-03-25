import { createSocketSessionAuthMiddleware } from '../shared/auth/session-auth.js';
import { pauseBattleForDisconnect, finishBattleByDisconnectTimeout } from '../modules/battle/services/battle.service.js';
import { createBattleSocketHandlers, registerBattleSocketHandlers } from '../modules/battle/socket/battle.socket.js';
import { createLobbySocketHandlers, registerLobbySocketHandlers } from '../modules/lobby/socket/lobby.socket.js';
import { bindPlayerSocket, markPlayerDisconnected } from '../modules/players/services/player-session.service.js';
import { SOCKET_EVENTS } from '../shared/constants/socket-events.js';
import { logger } from '../shared/logger/logger.js';

export const createSocketHandlersRegistrar = (dependencies = {}) => {
  const disconnectGracePeriodMs = dependencies.disconnectGracePeriodMs ?? 15_000;
  const pauseBattleForDisconnectDependency =
    dependencies.pauseBattleForDisconnectDependency ?? pauseBattleForDisconnect;
  const finishBattleByDisconnectTimeoutDependency =
    dependencies.finishBattleByDisconnectTimeoutDependency ?? finishBattleByDisconnectTimeout;
  const battleDisconnectTimers = new Map();

  const clearBattleDisconnectTimeout = (battleId) => {
    const existingTimeout = battleDisconnectTimers.get(String(battleId));

    if (existingTimeout) {
      clearTimeout(existingTimeout);
      battleDisconnectTimers.delete(String(battleId));
    }
  };

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
      onBattleResumedDependency: clearBattleDisconnectTimeout,
    });
  const registerBattleHandlers =
    dependencies.registerBattleHandlersDependency ??
    createBattleSocketHandlers({
      processAttackDependency: dependencies.processAttackDependency,
    });
  const bindPlayerSocketDependency = dependencies.bindPlayerSocketDependency ?? bindPlayerSocket;
  const markPlayerDisconnectedDependency =
    dependencies.markPlayerDisconnectedDependency ?? markPlayerDisconnected;

  return (io) => {
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
      logger.info('socket_connected', {
        socketId: socket.id,
        playerId: socket.data.player?.playerId ?? null,
      });

      void (async () => {
        try {
          await bindPlayerSocketDependency({
            playerId: socket.data.player?.playerId ?? null,
            socketId: socket.id,
          });
        } catch (error) {
          logger.error('socket_bind_player_failed', {
            socketId: socket.id,
            playerId: socket.data.player?.playerId ?? null,
            error: error instanceof Error ? error.message : 'unknown_error',
          });
        }
      })();

      socket.on('disconnect', (reason) => {
        logger.info('socket_disconnected', {
          socketId: socket.id,
          reason,
        });

        if (reason === 'server shutting down') {
          return;
        }

        void (async () => {
          try {
            const pausedBattle = await pauseBattleForDisconnectDependency({
              playerId: socket.data.player?.playerId ?? null,
              socketId: socket.id,
              gracePeriodMs: disconnectGracePeriodMs,
            });

            if (!pausedBattle) {
              await markPlayerDisconnectedDependency({
                playerId: socket.data.player?.playerId ?? null,
                socketId: socket.id,
              });
              return;
            }

            clearBattleDisconnectTimeout(pausedBattle.battleId);
            io.to(pausedBattle.lobbyId).emit(SOCKET_EVENTS.SERVER.BATTLE_PAUSE, pausedBattle);

            const timeoutId = setTimeout(async () => {
              try {
                const battleEnd = await finishBattleByDisconnectTimeoutDependency({
                  battleId: pausedBattle.battleId,
                });

                if (battleEnd) {
                  io.to(pausedBattle.lobbyId).emit(SOCKET_EVENTS.SERVER.BATTLE_END, battleEnd);
                }
              } catch (error) {
                logger.error('socket_disconnect_timeout_failed', {
                  socketId: socket.id,
                  battleId: pausedBattle.battleId,
                  error: error instanceof Error ? error.message : 'unknown_error',
                });
              } finally {
                battleDisconnectTimers.delete(String(pausedBattle.battleId));
              }
            }, disconnectGracePeriodMs);

            battleDisconnectTimers.set(String(pausedBattle.battleId), timeoutId);
          } catch (error) {
            logger.error('socket_disconnect_pause_failed', {
              socketId: socket.id,
              playerId: socket.data.player?.playerId ?? null,
              error: error instanceof Error ? error.message : 'unknown_error',
            });
          }
        })();
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
