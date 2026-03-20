import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from '../shared/logger/logger.js';

export const connectDatabase = async () => {
  if (!env.mongodbUri) {
    logger.warn('database_connection_skipped', {
      reason: 'MONGODB_URI is not configured',
    });
    return null;
  }

  const connection = await mongoose.connect(env.mongodbUri);

  logger.info('database_connected', {
    host: connection.connection.host,
    name: connection.connection.name,
  });

  return connection;
};
