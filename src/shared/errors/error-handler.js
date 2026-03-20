import { AppError } from './AppError.js';
import { logger } from '../logger/logger.js';
import { buildErrorResponse } from '../utils/api-response.js';

export const errorHandler = (error, request, response, _next) => {
  if (error instanceof AppError) {
    logger.warn('http_app_error', {
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    });

    return response
      .status(error.statusCode)
      .json(
        buildErrorResponse({
          message: error.message,
          details: error.details,
        }),
      );
  }

  logger.error('http_unhandled_error', {
    method: request.method,
    path: request.originalUrl ?? request.url,
    error,
  });

  return response
    .status(500)
    .json(
      buildErrorResponse({
        message: 'Internal server error',
      }),
    );
};
