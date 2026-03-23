import { SESSION_STATUS } from '../../../shared/constants/session-status.js';
import { PlayerModel } from '../schemas/player.schema.js';

export const createPlayer = async (payload) => PlayerModel.create(payload);

export const findPlayerById = async (playerId) => PlayerModel.findById(playerId);

export const findPlayerByNicknameNormalized = async (nicknameNormalized) =>
  PlayerModel.findOne({ nicknameNormalized });

export const findPlayerBySessionTokenHash = async (sessionTokenHash) =>
  PlayerModel.findOne({
    sessionTokenHash,
    sessionStatus: SESSION_STATUS.ACTIVE,
  });

export const findPlayerBySocketId = async (socketId) => PlayerModel.findOne({ socketId });

export const updatePlayerSocket = async (playerId, socketId) =>
  PlayerModel.findByIdAndUpdate(
    playerId,
    {
      socketId,
      lastSeenAt: new Date(),
      disconnectedAt: null,
    },
    { new: true },
  );

export const updatePlayerState = async (playerId, payload) =>
  PlayerModel.findByIdAndUpdate(playerId, payload, { new: true });

export const updatePlayersState = async (playerIds, payload) =>
  PlayerModel.updateMany(
    {
      _id: { $in: playerIds },
    },
    payload,
  );
