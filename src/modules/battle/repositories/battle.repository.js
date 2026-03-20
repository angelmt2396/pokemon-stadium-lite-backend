import { BattleModel } from '../schemas/battle.schema.js';

export const createBattle = async (payload) => BattleModel.create(payload);

export const findBattleById = async (battleId) => BattleModel.findById(battleId);

export const findBattleByLobbyId = async (lobbyId) =>
  BattleModel.findOne({ lobbyId }).sort({ createdAt: -1 });

export const updateBattleById = async (battleId, payload) =>
  BattleModel.findByIdAndUpdate(battleId, payload, { new: true });

export const saveBattle = async (battle) => battle.save();
