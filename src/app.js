import cors from 'cors';
import express from 'express';

import apiV1Router, { createApiV1Router } from './api/v1/index.js';
import { env } from './config/env.js';
import { errorHandler } from './shared/errors/error-handler.js';
import { buildErrorResponse, buildSuccessResponse } from './shared/utils/api-response.js';

export const createApp = (dependencies = {}) => {
  const app = express();

  app.use(
    cors({
      origin: dependencies.clientOriginsDependency ?? env.clientOrigins,
    }),
  );
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json(
      buildSuccessResponse({
        data: {
          status: 'ok',
          service: 'pokemon-stadium-lite-backend',
        },
      }),
    );
  });

  app.use(
    '/api/v1',
    dependencies.apiV1RouterDependency ??
      createApiV1Router({
        pokemonRouterDependency: dependencies.pokemonRouterDependency,
        listPokemonDependency: dependencies.listPokemonDependency,
        getPokemonByIdDependency: dependencies.getPokemonByIdDependency,
      }),
  );

  app.use((_request, response) => {
    response.status(404).json(
      buildErrorResponse({
        message: 'Route not found',
      }),
    );
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp({
  apiV1RouterDependency: apiV1Router,
});
