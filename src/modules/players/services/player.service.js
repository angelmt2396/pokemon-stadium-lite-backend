import { AppError } from '../../../shared/errors/AppError.js';
import { createPlayer } from '../repositories/player.repository.js';

export const registerPlayer = async ({ nickname, socketId }) => {
  if (!nickname || !nickname.trim()) {
    throw new AppError('Nickname is required', 400);
  }

  return createPlayer({
    nickname: nickname.trim(),
    socketId,
  });
};
