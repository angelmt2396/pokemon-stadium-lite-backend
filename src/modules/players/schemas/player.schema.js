import mongoose from 'mongoose';

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
  },
  {
    timestamps: true,
  },
);

export const PlayerModel = mongoose.models.Player || mongoose.model('Player', playerSchema);
