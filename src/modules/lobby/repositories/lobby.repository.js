import { LobbyModel } from '../schemas/lobby.schema.js';

export const createLobby = async (payload) => LobbyModel.create(payload);

export const findLobbyById = async (lobbyId) => LobbyModel.findById(lobbyId);

export const findLobbyByPlayerId = async (playerId) =>
  LobbyModel.findOne({
    'players.playerId': playerId,
  }).sort({ createdAt: -1 });

export const findCurrentLobby = async () =>
  LobbyModel.findOne({ status: { $ne: 'finished' } }).sort({ createdAt: -1 });

export const findWaitingLobby = async () =>
  LobbyModel.findOne({ status: 'waiting' }).sort({ createdAt: 1 });

export const updateLobbyById = async (lobbyId, payload) =>
  LobbyModel.findByIdAndUpdate(lobbyId, payload, { new: true });

export const saveLobby = async (lobby) => lobby.save();
