import mongoose from 'mongoose';
import { PLAYER_STATUS } from '../../../shared/constants/player-status.js';
import { SESSION_STATUS } from '../../../shared/constants/session-status.js';

const playerSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    nicknameNormalized: {
      type: String,
      trim: true,
      maxlength: 30,
      default() {
        return this.nickname?.trim().toLowerCase() ?? null;
      },
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
    sessionStatus: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.CLOSED,
    },
    sessionTokenHash: {
      type: String,
      default: undefined,
    },
    activeLobbyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lobby',
      default: null,
    },
    activeBattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Battle',
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    disconnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

playerSchema.index({ nicknameNormalized: 1 }, { unique: true, sparse: true });
playerSchema.index({ socketId: 1 }, { sparse: true });
playerSchema.index({ reconnectToken: 1 }, { unique: true });
playerSchema.index({ sessionTokenHash: 1 }, { unique: true, sparse: true });
playerSchema.index({ activeLobbyId: 1 });
playerSchema.index({ activeBattleId: 1 });

export const PlayerModel = mongoose.models.Player || mongoose.model('Player', playerSchema);
