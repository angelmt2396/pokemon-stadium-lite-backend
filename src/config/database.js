import mongoose from 'mongoose';

import { env } from './env.js';

export const connectDatabase = async () => {
  if (!env.mongodbUri) {
    console.warn('MONGODB_URI is not configured. Server started without database connection.');
    return null;
  }

  return mongoose.connect(env.mongodbUri);
};
