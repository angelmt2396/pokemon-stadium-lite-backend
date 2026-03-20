import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
import { logger } from '../../../shared/logger/logger.js';
import { attackPayloadSchema } from '../../../shared/validation/schemas.js';
import { withSocketValidation } from '../../../shared/validation/socket-validation.js';
import { processAttack } from '../services/battle.service.js';

const respond = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

export const createBattleSocketHandlers = (dependencies = {}) => {
  const {
    processAttackDependency = processAttack,
  } = dependencies;

  return (socket, io) => {
    socket.on(
      SOCKET_EVENTS.CLIENT.ATTACK,
      withSocketValidation(attackPayloadSchema, async (payload, callback) => {
        try {
          logger.info('socket_attack_received', {
            socketId: socket.id,
            playerId: payload.playerId,
            battleId: payload.battleId,
          });

          const result = await processAttackDependency({
            battleId: payload.battleId,
            playerId: payload.playerId,
          });

          io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.TURN_RESULT, result.turnResult);

          if (result.battleEnd) {
            io.to(result.lobbyId).emit(SOCKET_EVENTS.SERVER.BATTLE_END, result.battleEnd);
          }

          respond(callback, {
            ok: true,
            data: {
              accepted: result.accepted,
            },
          });

          logger.info('socket_attack_completed', {
            socketId: socket.id,
            playerId: payload.playerId,
            battleId: payload.battleId,
            lobbyId: result.lobbyId,
            battleEnded: Boolean(result.battleEnd),
          });
        } catch (error) {
          logger.warn('socket_attack_failed', {
            socketId: socket.id,
            playerId: payload.playerId,
            battleId: payload.battleId,
            error: error.message,
          });

          respond(callback, {
            ok: false,
            message: error.message,
          });
        }
      }),
    );
  };
};

export const registerBattleSocketHandlers = createBattleSocketHandlers();
