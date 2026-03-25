import crypto from 'node:crypto';

import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';
import { SESSION_STATUS } from '../../../shared/constants/session-status.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { runSerialized } from '../../../shared/utils/serial-executor.js';
import {
  createPlayer,
  findPlayerById,
  findPlayerByNicknameNormalized,
  findPlayerBySessionTokenHash,
  updatePlayerState,
} from '../repositories/player.repository.js';
import { createReconnectToken } from './player.service.js';

const normalizeNickname = (nickname) => nickname.trim().toLowerCase();
const createSessionToken = () => crypto.randomBytes(32).toString('hex');
export const hashSessionToken = (sessionToken) =>
  crypto.createHash('sha256').update(sessionToken).digest('hex');

export const normalizePlayerSessionPayload = (player, options = {}) => {
  const payload = {
    playerId: String(player.id),
    nickname: player.nickname,
    sessionStatus: player.sessionStatus,
    playerStatus: player.status,
    currentLobbyId: player.activeLobbyId ? String(player.activeLobbyId) : null,
    currentBattleId: player.activeBattleId ? String(player.activeBattleId) : null,
  };

  if (options.sessionToken) {
    payload.sessionToken = options.sessionToken;
  }

  if (options.reconnectToken) {
    payload.reconnectToken = options.reconnectToken;
  }
  return payload;
};

export const createPlayerSessionService = (dependencies = {}) => {
  const {
    runSerializedDependency = runSerialized,
    createPlayerDependency = createPlayer,
    findPlayerByIdDependency = findPlayerById,
    findPlayerByNicknameNormalizedDependency = findPlayerByNicknameNormalized,
    findPlayerBySessionTokenHashDependency = findPlayerBySessionTokenHash,
    updatePlayerStateDependency = updatePlayerState,
  } = dependencies;

  const createOrRefreshSession = async ({ nickname }) => {
    if (!nickname || !nickname.trim()) {
      throw new AppError('Nickname is required', 400);
    }

    const trimmedNickname = nickname.trim();
    const nicknameNormalized = normalizeNickname(trimmedNickname);

    return runSerializedDependency(`player-session:${nicknameNormalized}`, async () => {
      const existingPlayer = await findPlayerByNicknameNormalizedDependency(nicknameNormalized);
      const sessionToken = createSessionToken();
      const sessionTokenHash = hashSessionToken(sessionToken);
      const reconnectToken = createReconnectToken();
      const basePayload = {
        nickname: trimmedNickname,
        nicknameNormalized,
        sessionStatus: SESSION_STATUS.ACTIVE,
        sessionTokenHash,
        reconnectToken,
        socketId: null,
        lastSeenAt: new Date(),
        status: PLAYER_STATUS.IDLE,
        activeLobbyId: null,
        activeBattleId: null,
      };

      if (!existingPlayer) {
        const createdPlayer = await createPlayerDependency(basePayload);

        return normalizePlayerSessionPayload(createdPlayer, {
          sessionToken,
          reconnectToken,
        });
      }

      if (existingPlayer.sessionStatus === SESSION_STATUS.ACTIVE) {
        if (existingPlayer.disconnectedAt) {
          const reclaimedPlayer = await updatePlayerStateDependency(existingPlayer.id, {
            sessionTokenHash,
            reconnectToken,
            lastSeenAt: new Date(),
          });

          return normalizePlayerSessionPayload(reclaimedPlayer, {
            sessionToken,
            reconnectToken,
          });
        }

        throw new AppError('Nickname is already in use', 409);
      }

      const updatedPlayer = await updatePlayerStateDependency(existingPlayer.id, basePayload);

      return normalizePlayerSessionPayload(updatedPlayer, {
        sessionToken,
        reconnectToken,
      });
    });
  };

  const authenticatePlayerSession = async ({ sessionToken }) => {
    if (!sessionToken || !sessionToken.trim()) {
      throw new AppError('Session token is required', 401);
    }

    const sessionTokenHash = hashSessionToken(sessionToken.trim());
    const player = await findPlayerBySessionTokenHashDependency(sessionTokenHash);

    if (!player) {
      throw new AppError('Invalid or expired session token', 401);
    }

    return updatePlayerStateDependency(player.id, {
      lastSeenAt: new Date(),
    });
  };

  const getPlayerSession = async ({ playerId }) => {
    const player = await findPlayerByIdDependency(playerId);

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    return normalizePlayerSessionPayload(player);
  };

  const bindPlayerSocket = async ({ playerId, socketId }) => {
    if (!playerId || !socketId) {
      return null;
    }

    const player = await findPlayerByIdDependency(playerId);

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    return updatePlayerStateDependency(player.id, {
      socketId,
      disconnectedAt: null,
      lastSeenAt: new Date(),
    });
  };

  const markPlayerDisconnected = async ({ playerId, socketId }) => {
    if (!playerId || !socketId) {
      return null;
    }

    const player = await findPlayerByIdDependency(playerId);

    if (!player || String(player.socketId ?? '') !== String(socketId)) {
      return null;
    }

    return updatePlayerStateDependency(player.id, {
      socketId: null,
      disconnectedAt: new Date(),
      lastSeenAt: new Date(),
    });
  };

  const closePlayerSession = async ({ playerId }) => {
    const player = await findPlayerByIdDependency(playerId);

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    if (
      player.status !== PLAYER_STATUS.IDLE ||
      player.activeLobbyId !== null ||
      player.activeBattleId !== null
    ) {
      throw new AppError('Cannot close session while a match is active', 409);
    }

    const updatedPlayer = await updatePlayerStateDependency(player.id, {
      $set: {
        sessionStatus: SESSION_STATUS.CLOSED,
        socketId: null,
        lastSeenAt: new Date(),
      },
      $unset: {
        sessionTokenHash: 1,
      },
    });

    return normalizePlayerSessionPayload(updatedPlayer);
  };

  return {
    createOrRefreshSession,
    authenticatePlayerSession,
    getPlayerSession,
    bindPlayerSocket,
    markPlayerDisconnected,
    closePlayerSession,
  };
};

export const {
  createOrRefreshSession,
  authenticatePlayerSession,
  getPlayerSession,
  bindPlayerSocket,
  markPlayerDisconnected,
  closePlayerSession,
} = createPlayerSessionService();
