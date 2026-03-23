import mongoose from 'mongoose';

import { BATTLE_STATUS } from '../../../shared/constants/battle-status.js';

const battlePokemonSchema = new mongoose.Schema(
  {
    pokemonId: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    sprite: {
      type: String,
      required: true,
      trim: true,
    },
    hp: {
      type: Number,
      required: true,
    },
    currentHp: {
      type: Number,
      required: true,
    },
    attack: {
      type: Number,
      required: true,
    },
    defense: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
      required: true,
    },
    defeated: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const battlePlayerSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
    },
    activePokemonIndex: {
      type: Number,
      default: 0,
    },
    team: {
      type: [battlePokemonSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const battleLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
    timestamps: true,
  },
);

const battleSchema = new mongoose.Schema(
  {
    lobbyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lobby',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BATTLE_STATUS),
      default: BATTLE_STATUS.WAITING,
    },
    currentTurnPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    winnerPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    disconnectedPlayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    reconnectDeadlineAt: {
      type: Date,
      default: null,
    },
    finishReason: {
      type: String,
      default: null,
      trim: true,
    },
    players: {
      type: [battlePlayerSchema],
      default: [],
    },
    log: {
      type: [battleLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

battleSchema.index({ lobbyId: 1, createdAt: -1 });
battleSchema.index({ currentTurnPlayerId: 1 });

export const BattleModel = mongoose.models.Battle || mongoose.model('Battle', battleSchema);
