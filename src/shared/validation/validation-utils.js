import { ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';

export const getValidationMessage = (error, fallbackMessage = 'Invalid request payload') => {
  if (!(error instanceof ZodError)) {
    return fallbackMessage;
  }

  return error.issues[0]?.message ?? fallbackMessage;
};

export const getValidationDetails = (error) => {
  if (!(error instanceof ZodError)) {
    return null;
  }

  const firstIssue = error.issues[0];

  return {
    field: firstIssue?.path?.join('.') ?? null,
    reason: firstIssue?.code ?? 'invalid_input',
  };
};

export const toValidationAppError = (error, fallbackMessage) =>
  new AppError(getValidationMessage(error, fallbackMessage), 400, getValidationDetails(error));

