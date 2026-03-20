import { logger } from './logger.js';

const buildRequestPath = (request) => request.originalUrl ?? request.url;

export const requestLogger = (request, response, next) => {
  const startedAt = Date.now();

  response.on('finish', () => {
    logger.info('http_request_completed', {
      method: request.method,
      path: buildRequestPath(request),
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
      ip: request.ip,
    });
  });

  next();
};
