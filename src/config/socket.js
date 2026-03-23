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
    pingInterval: env.socketPingIntervalMs,
    pingTimeout: env.socketPingTimeoutMs,
  });

  logger.info('socket_server_initialized', {
    clientOrigins: env.clientOrigins,
    pingInterval: env.socketPingIntervalMs,
    pingTimeout: env.socketPingTimeoutMs,
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

export const closeSocketServer = async () =>
  new Promise((resolve, reject) => {
    if (!ioInstance) {
      resolve(false);
      return;
    }

    const currentIo = ioInstance;
    ioInstance = null;

    currentIo.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      logger.info('socket_server_closed');

      resolve(true);
    });
  });
