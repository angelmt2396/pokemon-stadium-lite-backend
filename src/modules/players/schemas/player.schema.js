import mongoose from 'mongoose';
import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';

const playerSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    socketId: {
      type: String,
      default: null,
    },
    reconnectToken: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PLAYER_STATUS),
      default: PLAYER_STATUS.IDLE,
    },
    activeLobbyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lobby',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

playerSchema.index({ socketId: 1 }, { sparse: true });
playerSchema.index({ reconnectToken: 1 }, { unique: true });
playerSchema.index({ activeLobbyId: 1 });

export const PlayerModel = mongoose.models.Player || mongoose.model('Player', playerSchema);
