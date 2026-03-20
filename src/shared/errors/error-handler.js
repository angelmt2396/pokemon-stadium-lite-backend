import { AppError } from './AppError.js';
import { buildErrorResponse } from '../utils/api-response.js';

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    return response
      .status(error.statusCode)
      .json(
        buildErrorResponse({
          message: error.message,
          details: error.details,
        }),
      );
  }

  console.error(error);

  return response
    .status(500)
    .json(
      buildErrorResponse({
        message: 'Internal server error',
      }),
    );
};
