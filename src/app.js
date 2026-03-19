import cors from 'cors';
import express from 'express';

import apiV1Router from './api/v1/index.js';
import { env } from './config/env.js';
import { errorHandler } from './shared/errors/error-handler.js';

export const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
  }),
);
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'pokemon-stadium-lite-backend',
  });
});

app.use('/api/v1', apiV1Router);

app.use((_request, response) => {
  response.status(404).json({
    message: 'Route not found',
  });
});

app.use(errorHandler);
