import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
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
    socket.on(SOCKET_EVENTS.CLIENT.ATTACK, async (payload, callback) => {
      try {
        const result = await processAttackDependency({
          battleId: payload?.battleId,
          playerId: payload?.playerId,
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
      } catch (error) {
        respond(callback, {
          ok: false,
          message: error.message,
        });
      }
    });
  };
};

export const registerBattleSocketHandlers = createBattleSocketHandlers();
