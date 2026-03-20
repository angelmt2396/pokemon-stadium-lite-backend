import http from 'node:http';

import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { createSocketServer } from './config/socket.js';
import { logger } from './shared/logger/logger.js';

const server = http.createServer(app);

createSocketServer(server);

const startServer = async () => {
  await connectDatabase();

  server.listen(env.port, () => {
    logger.info('server_started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      logLevel: env.logLevel,
    });
  });
};

startServer().catch((error) => {
  logger.error('server_start_failed', {
    error,
  });
  process.exit(1);
});
