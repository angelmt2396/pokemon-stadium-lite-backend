import { AppError } from './AppError.js';

export const errorHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  console.error(error);

  return response.status(500).json({
    message: 'Internal server error',
  });
};
