import { Server } from 'socket.io';

import { env } from './env.js';
import { registerSocketHandlers } from '../sockets/register-events.js';
import { logger } from '../shared/logger/logger.js';

let ioInstance;

export const createSocketServer = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.clientOrigins,
    },
  });

  logger.info('socket_server_initialized', {
    clientOrigins: env.clientOrigins,
  });

  registerSocketHandlers(ioInstance);

  return ioInstance;
};

export const getSocketServer = () => {
  if (!ioInstance) {
    throw new Error('Socket server is not initialized');
  }

  return ioInstance;
};
