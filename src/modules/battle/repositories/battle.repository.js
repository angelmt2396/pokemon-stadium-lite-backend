import { BattleModel } from '../schemas/battle.schema.js';

export const createBattle = async (payload) => BattleModel.create(payload);

export const findBattleById = async (battleId) => BattleModel.findById(battleId);

export const updateBattleById = async (battleId, payload) =>
  BattleModel.findByIdAndUpdate(battleId, payload, { new: true });
