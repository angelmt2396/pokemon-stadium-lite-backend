import http from 'node:http';

import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { createSocketServer } from './config/socket.js';

const server = http.createServer(app);

createSocketServer(server);

const startServer = async () => {
  await connectDatabase();

  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
