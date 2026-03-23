import http from 'node:http';

import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { closeSocketServer, createSocketServer } from './config/socket.js';
import { logger } from './shared/logger/logger.js';
import { createGracefulShutdownManager } from './shared/runtime/graceful-shutdown.js';

const server = http.createServer(app);

createSocketServer(server);

const shutdownManager = createGracefulShutdownManager({
  httpServer: server,
  logger,
  closeSocketServerDependency: closeSocketServer,
  disconnectDatabaseDependency: disconnectDatabase,
  timeoutMs: env.shutdownTimeoutMs,
});

shutdownManager.registerSignalHandlers();

const startServer = async () => {
  logger.info('server_booting', {
    port: env.port,
    nodeEnv: env.nodeEnv,
    logLevel: env.logLevel,
  });

  await connectDatabase();

  server.listen(env.port, '0.0.0.0', () => {
    logger.info('server_started', {
      port: env.port,
      host: '0.0.0.0',
      nodeEnv: env.nodeEnv,
      logLevel: env.logLevel,
      shutdownTimeoutMs: env.shutdownTimeoutMs,
    });
  });
};

startServer().catch((error) => {
  logger.error('server_start_failed', {
    error,
  });
  process.exit(1);
});
