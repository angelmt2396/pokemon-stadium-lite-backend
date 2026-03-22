import crypto from 'node:crypto';

import { AppError } from '../../../shared/errors/AppError.js';
import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';
import { createPlayer } from '../repositories/player.repository.js';

export const createReconnectToken = () => crypto.randomBytes(24).toString('hex');
const normalizeNickname = (nickname) => nickname.trim().toLowerCase();

export const registerPlayer = async ({ nickname, socketId }) => {
  if (!nickname || !nickname.trim()) {
    throw new AppError('Nickname is required', 400);
  }

  return createPlayer({
    nickname: nickname.trim(),
    nicknameNormalized: normalizeNickname(nickname),
    socketId,
    reconnectToken: createReconnectToken(),
    status: PLAYER_STATUS.IDLE,
    activeLobbyId: null,
    activeBattleId: null,
  });
};
