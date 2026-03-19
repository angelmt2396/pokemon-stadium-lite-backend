import { SOCKET_EVENTS } from '../../../shared/constants/socket-events.js';
import { processAttack } from '../services/battle.service.js';

const respond = (callback, payload) => {
  if (typeof callback === 'function') {
    callback(payload);
  }
};

export const registerBattleSocketHandlers = (socket) => {
  socket.on(SOCKET_EVENTS.CLIENT.ATTACK, async (payload, callback) => {
    try {
      const result = await processAttack({
        battleId: payload?.battleId,
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
