import { PlayerModel } from '../schemas/player.schema.js';

export const createPlayer = async (payload) => PlayerModel.create(payload);

export const findPlayerById = async (playerId) => PlayerModel.findById(playerId);

export const findPlayerBySocketId = async (socketId) => PlayerModel.findOne({ socketId });

export const updatePlayerSocket = async (playerId, socketId) =>
  PlayerModel.findByIdAndUpdate(playerId, { socketId }, { new: true });
