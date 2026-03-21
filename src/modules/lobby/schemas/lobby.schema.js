import mongoose from 'mongoose';

import { LOBBY_STATUS } from '../../../shared/constants/lobby-status.js';

const assignedPokemonSchema = new mongoose.Schema(
  {
    pokemonId: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const lobbyPlayerSchema = new mongoose.Schema(
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
    ready: {
      type: Boolean,
      default: false,
    },
    team: {
      type: [assignedPokemonSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const lobbySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(LOBBY_STATUS),
      default: LOBBY_STATUS.WAITING,
    },
    players: {
      type: [lobbyPlayerSchema],
      default: [],
      validate: {
        validator: (players) => players.length <= 2,
        message: 'A lobby can contain up to 2 players',
      },
    },
  },
  {
    timestamps: true,
  },
);

lobbySchema.index({ status: 1, createdAt: 1 });
lobbySchema.index({ 'players.playerId': 1 });

export const LobbyModel = mongoose.models.Lobby || mongoose.model('Lobby', lobbySchema);
