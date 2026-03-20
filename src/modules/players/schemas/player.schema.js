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

export const PlayerModel = mongoose.models.Player || mongoose.model('Player', playerSchema);
