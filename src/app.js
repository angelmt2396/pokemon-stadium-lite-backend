import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import apiV1Router, { createApiV1Router } from './api/v1/index.js';
import { env } from './config/env.js';
import { buildDocumentationPage } from '../docs/documentation-page.js';
import { openApiSpec } from '../docs/openapi.js';
import { errorHandler } from './shared/errors/error-handler.js';
import { requestLogger } from './shared/logger/request-logger.js';
import { buildErrorResponse, buildSuccessResponse } from './shared/utils/api-response.js';

export const createApp = (dependencies = {}) => {
  const app = express();

  app.use(
    cors({
      origin: dependencies.clientOriginsDependency ?? env.clientOrigins,
    }),
  );
  app.use(express.json());
  app.use(requestLogger);

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

  app.get('/docs/openapi.json', (_request, response) => {
    response.json(openApiSpec);
  });

  app.get('/documentation', (_request, response) => {
    response.type('html').send(buildDocumentationPage());
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      customSiteTitle: 'Pokemon Stadium Lite Backend Docs',
    }),
  );

  app.use(
    '/api/v1',
    dependencies.apiV1RouterDependency ??
      createApiV1Router({
        playerSessionRouterDependency: dependencies.playerSessionRouterDependency,
        createOrRefreshSessionDependency: dependencies.createOrRefreshSessionDependency,
        getPlayerSessionDependency: dependencies.getPlayerSessionDependency,
        closePlayerSessionDependency: dependencies.closePlayerSessionDependency,
        authenticatePlayerSessionDependency: dependencies.authenticatePlayerSessionDependency,
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
